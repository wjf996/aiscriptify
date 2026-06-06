import {
  Alert,
  AppShell,
  Badge,
  Button,
  Container,
  Grid,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconBook2,
  IconChevronDown,
  IconChevronUp,
  IconCircleCheck,
  IconCopy,
  IconDownload,
  IconFileText,
  IconFileCode,
  IconFileImport,
  IconTrash,
  IconPencil,
  IconPlayerPlay,
  IconReload,
  IconSettingsCheck,
  IconSparkles,
  IconWand,
  IconUsers,
} from "@tabler/icons-react";
import { ChangeEvent, useRef, useState } from "react";

import {
  PolishSuggestion,
  ScriptStyle,
  convertNovel,
  generatePolishSuggestions,
  validateChapters,
  validateYaml,
} from "./api";

const sampleYaml = `title: 待生成剧本
script_type: screenplay
characters: []
chapters: []`;

const sampleNovel = `第一章 雨夜归来
雨下得很急，林夏拖着行李箱回到旧书店门口。她发现门缝里透出灯光，失踪三年的周远正坐在柜台后，手里握着一本被烧焦的日记。

第二章 旧书店的秘密
林夏追问周远为何突然回来。周远告诉她，父亲留下的日记里藏着一份剧本残稿，而残稿中的每一场戏都和他们过去的经历完全重合。

第三章 天台对峙
两人带着日记来到天台，遇见一直暗中跟踪他们的沈舟。沈舟承认自己想拿走残稿，却也揭开了林夏父亲当年离开的真相。`;

const MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024;
const CHAPTER_TITLE_PATTERN =
  /^\s*(第[一二三四五六七八九十百千万零〇两\d]+[章节回幕集]|Chapter\s+\d+|CHAPTER\s+\d+|chapter\s+\d+)[^\n]*/gm;

type YamlStatus = {
  valid: boolean;
  message: string;
};

type ScriptChapterSummary = {
  value: string;
  label: string;
  title: string;
  summary: string;
  characters: string[];
  scenes: string[];
};

type HighlightedYamlLine = {
  lineNumber: number;
  beforeKey: string;
  key: string;
  afterKey: string;
  keyClassName: string;
  raw: string;
};

type GenerationStep = {
  label: string;
  status: "pending" | "active" | "done";
};

const initialGenerationSteps: GenerationStep[] = [
  { label: "校验章节", status: "pending" },
  { label: "调用 AI", status: "pending" },
  { label: "整理 YAML", status: "pending" },
  { label: "生成摘要", status: "pending" },
];

function analyzeYamlText(yamlText: string): YamlStatus {
  const trimmed = yamlText.trim();
  if (!trimmed) {
    return { valid: false, message: "YAML 内容为空" };
  }

  const requiredKeys = ["title:", "script_type:", "characters:", "chapters:"];
  const missingKeys = requiredKeys.filter((key) => !trimmed.includes(key));
  if (missingKeys.length > 0) {
    return { valid: false, message: `缺少必要字段：${missingKeys.join("、")}` };
  }

  const lines = trimmed.split(/\r?\n/);
  for (const line of lines) {
    const leadingSpaces = line.match(/^ */)?.[0].length ?? 0;
    if (leadingSpaces % 2 !== 0) {
      return { valid: false, message: "存在奇数缩进，YAML 建议使用 2 个空格缩进" };
    }
  }

  return { valid: true, message: "YAML 基础结构有效，可继续编辑和打磨" };
}

function buildChapterSummaries(script: Record<string, unknown>): ScriptChapterSummary[] {
  const chapters = Array.isArray(script.chapters) ? script.chapters : [];

  return chapters
    .map((chapter, index) => {
      if (!isRecord(chapter)) {
        return null;
      }

      const chapterTitle = getText(chapter.chapter_title) || `第 ${index + 1} 章`;
      const chapterSummary = getText(chapter.summary) || "本章摘要待补充";
      const scenes = Array.isArray(chapter.scenes) ? chapter.scenes : [];
      const characters = uniqueStrings(
        scenes.flatMap((scene) => {
          if (!isRecord(scene) || !Array.isArray(scene.characters)) {
            return [];
          }
          return scene.characters.map((character) => getText(character)).filter(Boolean);
        }),
      );
      const sceneSummaries = scenes
        .map((scene, sceneIndex) => {
          if (!isRecord(scene)) {
            return "";
          }

          const location = cleanScenePart(scene.location);
          const time = cleanScenePart(scene.time);
          const sceneId = getText(scene.scene_id) || `scene_${sceneIndex + 1}`;
          if (location && time) {
            return `${location} · ${time}`;
          }
          return location || time || sceneId;
        })
        .filter(Boolean);

      return {
        value: String(index),
        label: `第 ${index + 1} 章`,
        title: chapterTitle,
        summary: chapterSummary,
        characters,
        scenes: sceneSummaries,
      };
    })
    .filter((chapter): chapter is ScriptChapterSummary => chapter !== null);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getText(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function cleanScenePart(value: unknown): string {
  const text = getText(value);
  return text === "待补充地点" || text === "待补充时间" ? "" : text;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (!value || seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

function countNovelCharacters(text: string): number {
  return text.replace(/\s/g, "").length;
}

function countNovelChapters(text: string): number {
  return [...text.matchAll(CHAPTER_TITLE_PATTERN)].length;
}

function getInputQualityMessage(chapterTotal: number, characterTotal: number): string {
  if (characterTotal === 0) {
    return "等待输入小说文本";
  }
  if (chapterTotal < 3) {
    return `已识别 ${chapterTotal} 章 / ${characterTotal} 字，至少需要 3 章`;
  }
  return `已识别 ${chapterTotal} 章 / ${characterTotal} 字，可生成剧本 YAML`;
}

function buildHighlightedYamlLines(yamlText: string): HighlightedYamlLine[] {
  return yamlText.split(/\r?\n/).map((line, index) => {
    const match = line.match(/^(\s*-?\s*)([A-Za-z_][\w-]*)(:.*)$/);
    if (!match) {
      return {
        lineNumber: index + 1,
        beforeKey: "",
        key: "",
        afterKey: "",
        keyClassName: "",
        raw: line,
      };
    }

    const key = match[2];
    return {
      lineNumber: index + 1,
      beforeKey: match[1],
      key,
      afterKey: match[3],
      keyClassName: getYamlKeyClassName(key),
      raw: line,
    };
  });
}

function getYamlKeyClassName(key: string): string {
  if (["title", "script_type", "chapter_title", "summary"].includes(key)) {
    return "yaml-key-blue";
  }
  if (["characters", "speaker", "line"].includes(key)) {
    return "yaml-key-orange";
  }
  if (["chapters", "scenes", "location", "time", "action", "dialogues"].includes(key)) {
    return "yaml-key-green";
  }
  return "yaml-key-default";
}

function getPolishLocator(category: string) {
  if (category.includes("角色")) {
    return {
      label: "角色",
      path: "characters",
      keys: ["characters", "speaker"],
      color: "teal",
      hint: "建议检查角色设定、人物目标和每章行动动机。",
    };
  }

  if (category.includes("场景") || category.includes("冲突")) {
    return {
      label: "场景",
      path: "chapters.scenes",
      keys: ["scenes", "location", "time", "action"],
      color: "green",
      hint: "建议检查场景地点、时间、动作和冲突设计。",
    };
  }

  if (category.includes("对白") || category.includes("语气")) {
    return {
      label: "对白",
      path: "dialogues",
      keys: ["dialogues", "speaker", "line"],
      color: "orange",
      hint: "建议检查 speaker 和 line，区分角色说话方式。",
    };
  }

  if (category.includes("节奏") || category.includes("结构")) {
    return {
      label: "节奏",
      path: "summary / action",
      keys: ["chapter_title", "summary", "action"],
      color: "blue",
      hint: "建议检查章节摘要、场景动作和结尾转折。",
    };
  }

  return {
    label: "结构",
    path: "script",
    keys: ["title", "chapters", "scenes"],
    color: "gray",
    hint: "建议检查 YAML 中对应的角色、章节或场景内容。",
  };
}

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState<ScriptStyle>("screenplay");
  const [novelText, setNovelText] = useState("");
  const [chapterCount, setChapterCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [sceneCount, setSceneCount] = useState(0);
  const [characterNames, setCharacterNames] = useState<string[]>([]);
  const [sceneSummaries, setSceneSummaries] = useState<string[]>([]);
  const [chapterSummaries, setChapterSummaries] = useState<ScriptChapterSummary[]>([]);
  const [selectedChapter, setSelectedChapter] = useState("all");
  const [statusMessage, setStatusMessage] = useState("等待输入小说文本");
  const [errorMessage, setErrorMessage] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>(initialGenerationSteps);
  const [isCheckingYaml, setIsCheckingYaml] = useState(false);
  const [isGeneratingPolish, setIsGeneratingPolish] = useState(false);
  const [polishSuggestions, setPolishSuggestions] = useState<PolishSuggestion[]>([]);
  const [polishSource, setPolishSource] = useState<"ai" | "fallback" | "">("");
  const [selectedPolishIndex, setSelectedPolishIndex] = useState<number | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<string | null>("preview");
  const [isNovelInputCollapsed, setIsNovelInputCollapsed] = useState(false);
  const [yamlDraft, setYamlDraft] = useState(sampleYaml);
  const [yamlStatus, setYamlStatus] = useState<YamlStatus>(analyzeYamlText(sampleYaml));

  const resetGeneratedState = () => {
    setChapterCount(0);
    setCharacterCount(0);
    setSceneCount(0);
    setCharacterNames([]);
    setSceneSummaries([]);
    setChapterSummaries([]);
    setSelectedChapter("all");
    setPolishSuggestions([]);
    setPolishSource("");
    setSelectedPolishIndex(null);
    setYamlDraft(sampleYaml);
    setYamlStatus(analyzeYamlText(sampleYaml));
    setGenerationSteps(initialGenerationSteps);
  };

  const updateGenerationStep = (activeIndex: number) => {
    setGenerationSteps(
      initialGenerationSteps.map((step, index) => ({
        ...step,
        status: index < activeIndex ? "done" : index === activeIndex ? "active" : "pending",
      })),
    );
  };

  const completeGenerationSteps = () => {
    setGenerationSteps(initialGenerationSteps.map((step) => ({ ...step, status: "done" })));
  };

  const handleValidate = async () => {
    setErrorMessage("");
    setStatusMessage("正在校验章节...");
    setIsValidating(true);
    updateGenerationStep(0);

    try {
      const validation = await validateChapters({ title, text: novelText, style });
      setChapterCount(validation.chapter_count);

      if (!validation.valid) {
        setCharacterCount(0);
        setSceneCount(0);
        setCharacterNames([]);
        setSceneSummaries([]);
        setChapterSummaries([]);
        setSelectedChapter("all");
        setStatusMessage(validation.message);
        setErrorMessage(validation.message);
        return;
      }

      updateGenerationStep(1);
      setStatusMessage("正在调用 AI 生成剧本初稿...");
      const result = await convertNovel({ title, text: novelText, style });
      updateGenerationStep(2);
      setStatusMessage("正在整理 YAML 结构...");
      setChapterCount(result.chapter_count);
      setCharacterCount(result.character_count);
      setSceneCount(result.scene_count);
      setCharacterNames(result.character_names);
      setSceneSummaries(result.scene_summaries);
      updateGenerationStep(3);
      setStatusMessage("正在生成章节、角色和场景摘要...");
      setChapterSummaries(buildChapterSummaries(result.script));
      setSelectedChapter("all");
      setPolishSuggestions([]);
      setPolishSource("");
      setSelectedPolishIndex(null);
      setYamlDraft(result.yaml);
      setYamlStatus({
        valid: result.yaml_valid,
        message: result.yaml_valid
          ? "YAML 基础结构有效，可继续编辑和打磨"
          : result.yaml_error || "YAML 校验未通过",
      });
      setIsNovelInputCollapsed(true);
      setStatusMessage(
        result.warnings.length > 0
          ? result.warnings[0]
          : "YAML 剧本初稿生成完成，可以查看结构摘要、生成打磨建议或导出 YAML",
      );
      completeGenerationSteps();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 转换失败");
      setStatusMessage("转换失败");
    } finally {
      setIsValidating(false);
    }
  };

  const handleCopyYaml = async () => {
    await navigator.clipboard.writeText(yamlDraft);
    setStatusMessage("已复制当前 YAML 内容");
  };

  const handleCheckYaml = async () => {
    setIsCheckingYaml(true);
    setErrorMessage("");

    try {
      const result = await validateYaml({ yaml: yamlDraft });
      setYamlStatus({ valid: result.valid, message: result.message });
      setStatusMessage(result.valid ? "当前 YAML 已通过后端校验" : "当前 YAML 未通过校验，请检查格式");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "YAML 校验失败");
      setStatusMessage("YAML 校验失败");
    } finally {
      setIsCheckingYaml(false);
    }
  };

  const handleGeneratePolishSuggestions = async () => {
    if (!yamlDraft.trim() || yamlDraft === sampleYaml) {
      setStatusMessage("请先生成或填写剧本 YAML，再生成打磨建议");
      return;
    }

    setIsGeneratingPolish(true);
    setErrorMessage("");

    try {
      const result = await generatePolishSuggestions({ yaml: yamlDraft });
      setPolishSuggestions(result.suggestions);
      setPolishSource(result.source);
      setSelectedPolishIndex(result.suggestions.length > 0 ? 0 : null);
      setActiveRightTab("polish");
      setStatusMessage(
        result.source === "ai" ? "AI 打磨建议已生成" : result.warnings[0] || "已生成规则兜底建议",
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "打磨建议生成失败");
      setStatusMessage("打磨建议生成失败");
    } finally {
      setIsGeneratingPolish(false);
    }
  };

  const handleImportNovelFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) {
      return;
    }

    const fileName = file.name;
    const extension = fileName.split(".").pop()?.toLowerCase();
    if (!extension || !["txt", "md"].includes(extension)) {
      setErrorMessage("仅支持导入 .txt 或 .md 小说文本文件");
      setStatusMessage("文件导入失败");
      return;
    }

    if (file.size > MAX_IMPORT_FILE_SIZE) {
      setErrorMessage("文件大小不能超过 2MB，请导入较短的小说片段");
      setStatusMessage("文件导入失败");
      return;
    }

    try {
      const importedText = await file.text();
      setNovelText(importedText);
      if (!title.trim()) {
        setTitle(fileName.replace(/\.(txt|md)$/i, ""));
      }
      resetGeneratedState();
      setIsNovelInputCollapsed(false);
      setErrorMessage("");
      setStatusMessage(
        `已导入 ${fileName}，${getInputQualityMessage(
          countNovelChapters(importedText),
          countNovelCharacters(importedText),
        )}`,
      );
    } catch {
      setErrorMessage("文件读取失败，请检查文件编码或重新选择文件");
      setStatusMessage("文件导入失败");
    }
  };

  const handleClearInput = () => {
    setNovelText("");
    resetGeneratedState();
    setIsNovelInputCollapsed(false);
    setErrorMessage("");
    setStatusMessage("已清空小说输入和生成结果");
  };

  const handleFillSample = () => {
    setNovelText(sampleNovel);
    if (!title.trim()) {
      setTitle("雨夜残稿");
    }
    resetGeneratedState();
    setIsNovelInputCollapsed(false);
    setErrorMessage("");
    setStatusMessage(
      `已填充示例小说，${getInputQualityMessage(countNovelChapters(sampleNovel), countNovelCharacters(sampleNovel))}`,
    );
  };

  const handleDownloadYaml = () => {
    const blob = new Blob([yamlDraft], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = title.trim() || "aiscriptify";

    link.href = url;
    link.download = `${safeTitle}-script.yaml`;
    link.click();
    URL.revokeObjectURL(url);
    setStatusMessage("已下载当前 YAML 内容");
  };

  const selectedChapterSummary =
    selectedChapter === "all"
      ? null
      : chapterSummaries.find((chapter) => chapter.value === selectedChapter) ?? null;
  const inputCharacterCount = countNovelCharacters(novelText);
  const inputChapterCount = countNovelChapters(novelText);
  const inputReady = inputChapterCount >= 3;
  const inputQualityMessage = getInputQualityMessage(inputChapterCount, inputCharacterCount);
  const feedbackMessage = yamlStatus.valid ? statusMessage : yamlStatus.message;
  const feedbackColor = errorMessage ? "red" : yamlStatus.valid ? "teal" : "yellow";
  const highlightedYamlLines = buildHighlightedYamlLines(yamlDraft);
  const hasGeneratedScript = chapterCount > 0 && yamlDraft !== sampleYaml;
  const showCompactInput = hasGeneratedScript && isNovelInputCollapsed;
  const selectedPolishLocator =
    selectedPolishIndex !== null && polishSuggestions[selectedPolishIndex]
      ? getPolishLocator(polishSuggestions[selectedPolishIndex].category)
      : null;

  const handleSelectPolishSuggestion = (index: number) => {
    setSelectedPolishIndex(index);
    setActiveRightTab("preview");
  };

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between">
            <Group gap="sm">
              <Paper className="brand-mark" radius="md">
                <IconSparkles size={20} />
              </Paper>
              <Stack gap={0}>
                <Title order={3}>aiscriptify</Title>
                <Text size="xs" c="dimmed">
                  AI 小说转剧本创作工作台
                </Text>
              </Stack>
            </Group>
            <Badge variant="light" color="teal">
              小说转剧本 YAML
            </Badge>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl">
          <Stack gap="xl">
            <Paper className="hero-panel" p="xl" radius="md">
              <Stack gap="md">
                <Group gap="xs">
                  <Badge color="teal" variant="light">
                    XEngineer 作品
                  </Badge>
                  <Badge color="blue" variant="light">
                    YAML Schema Ready
                  </Badge>
                </Group>
                <Title order={1}>AI 小说转剧本工具</Title>
                <Text c="dimmed" maw={760}>
                  输入 3 个章节以上的小说文本，生成可编辑、可校验、可继续打磨的 YAML 剧本初稿。
                </Text>
                <Group gap="sm">
                  <Badge className="feature-badge" leftSection={<IconUsers size={14} />}>
                    角色智能提取
                  </Badge>
                  <Badge className="feature-badge" leftSection={<IconBook2 size={14} />}>
                    场景自动分镜
                  </Badge>
                  <Badge className="feature-badge" leftSection={<IconFileCode size={14} />}>
                    结构化 YAML
                  </Badge>
                </Group>
              </Stack>
            </Paper>

            <Stack gap="lg">
              <Stack gap={4}>
                <Title order={2}>创作工作台</Title>
                <Text c="dimmed">
                  先整理小说原文，生成后聚焦查看结构化剧本、章节摘要和 YAML 编辑区。
                </Text>
              </Stack>

              <Alert icon={<IconFileText size={18} />} color="blue" variant="light" radius="md">
                生成后可以查看章节、角色和场景摘要，并继续编辑完整 YAML 初稿。
              </Alert>

              {errorMessage && (
                <Alert icon={<IconAlertCircle size={18} />} color="red" variant="light" radius="md">
                  {errorMessage}
                </Alert>
              )}

              {showCompactInput && (
                <Paper withBorder p="md" radius="md" className="workspace-card compact-input-summary">
                  <Group justify="space-between" align="center" gap="md">
                    <Group gap="xs">
                      <IconBook2 size={18} />
                      <Text fw={700}>{title.trim() || "未命名作品"}</Text>
                      <Badge color="teal" variant="light">
                        已生成
                      </Badge>
                      <Badge color="gray" variant="light">
                        章节 {inputChapterCount}
                      </Badge>
                      <Badge color="gray" variant="light">
                        字数 {inputCharacterCount}
                      </Badge>
                    </Group>

                    <Group gap="xs">
                      <Button
                        variant="light"
                        leftSection={<IconChevronDown size={16} />}
                        onClick={() => setIsNovelInputCollapsed(false)}
                      >
                        编辑小说输入
                      </Button>
                      <Button leftSection={<IconPlayerPlay size={16} />} loading={isValidating} onClick={handleValidate}>
                        重新生成
                      </Button>
                    </Group>
                  </Group>
                </Paper>
              )}

              <Grid gutter="lg">
                {!showCompactInput && (
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper withBorder p="lg" radius="md" className="workspace-card">
                    <Stack>
                      <Group justify="space-between">
                        <Group gap="xs">
                          <IconBook2 size={20} />
                          <Title order={4}>小说输入</Title>
                        </Group>
                        <Badge variant="outline" color={inputReady ? "teal" : "blue"}>
                          {inputReady ? "可生成" : "至少 3 章"}
                        </Badge>
                      </Group>

                      <TextInput
                        label="作品标题"
                        placeholder="请输入小说标题"
                        value={title}
                        onChange={(event) => setTitle(event.currentTarget.value)}
                      />

                      <Select
                        label="剧本类型"
                        placeholder="请选择剧本类型"
                        defaultValue="screenplay"
                        value={style}
                        onChange={(value) => setStyle((value as ScriptStyle | null) ?? "screenplay")}
                        data={[
                          { value: "screenplay", label: "影视剧" },
                          { value: "short_drama", label: "短剧" },
                          { value: "audio_drama", label: "广播剧" },
                        ]}
                      />

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.md,text/plain,text/markdown"
                        hidden
                        onChange={handleImportNovelFile}
                      />

                      <Textarea
                        label="小说文本"
                        placeholder="请粘贴至少 3 个章节的小说文本，或导入 .txt / .md 文件..."
                        value={novelText}
                        onChange={(event) => setNovelText(event.currentTarget.value)}
                        minRows={18}
                        styles={{ input: { height: 520, overflowY: "auto", resize: "vertical" } }}
                      />

                      <Paper withBorder p="sm" radius="md" className="summary-panel">
                        <Group justify="space-between" align="center">
                          <Group gap="xs">
                            <Badge color={inputReady ? "teal" : "yellow"} variant="light">
                              章节 {inputChapterCount}
                            </Badge>
                            <Badge color="gray" variant="light">
                              字数 {inputCharacterCount}
                            </Badge>
                          </Group>
                          <Text size="sm" c={inputReady ? "teal" : "dimmed"}>
                            {inputQualityMessage}
                          </Text>
                        </Group>
                      </Paper>

                      {isValidating && (
                        <Paper withBorder p="sm" radius="md" className="summary-panel">
                          <Stack gap="xs">
                            <Text size="sm" fw={700}>
                              生成进度
                            </Text>
                            <Group gap="xs">
                              {generationSteps.map((step) => (
                                <Badge
                                  key={step.label}
                                  color={
                                    step.status === "done" ? "teal" : step.status === "active" ? "blue" : "gray"
                                  }
                                  variant={step.status === "active" ? "filled" : "light"}
                                >
                                  {step.label}
                                </Badge>
                              ))}
                            </Group>
                          </Stack>
                        </Paper>
                      )}

                      <Group justify="space-between">
                        <Group gap="xs">
                          <Button
                            variant="light"
                            leftSection={<IconFileImport size={16} />}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            导入文件
                          </Button>
                          <Button
                            variant="subtle"
                            color="gray"
                            leftSection={<IconTrash size={16} />}
                            onClick={handleClearInput}
                          >
                            清空输入
                          </Button>
                        </Group>

                        <Group gap="xs">
                          <Button
                            variant="light"
                            leftSection={<IconReload size={16} />}
                            onClick={handleFillSample}
                          >
                            填充示例
                          </Button>
                          <Badge color="gray" variant="light">
                            示例含 3 章
                          </Badge>
                          <Button
                            leftSection={<IconPlayerPlay size={18} />}
                            loading={isValidating}
                            onClick={handleValidate}
                          >
                            生成剧本 YAML
                          </Button>
                          {hasGeneratedScript && (
                            <Button
                              variant="subtle"
                              color="gray"
                              leftSection={<IconChevronUp size={16} />}
                              onClick={() => setIsNovelInputCollapsed(true)}
                            >
                              收起输入
                            </Button>
                          )}
                        </Group>
                      </Group>
                    </Stack>
                  </Paper>
                </Grid.Col>
                )}

                <Grid.Col span={{ base: 12, md: showCompactInput ? 12 : 6 }}>
                  <Paper withBorder p="lg" radius="md" className="workspace-card">
                    <Stack>
                    <Group justify="space-between">
                      <Group gap="xs">
                        <IconPencil size={20} />
                        <Title order={4}>剧本 YAML 初稿</Title>
                      </Group>
                      <Group gap="xs">
                        <Badge color="gray" variant="light">
                          章节 {chapterCount}
                        </Badge>
                        <Badge color="gray" variant="light">
                          角色 {characterCount}
                        </Badge>
                        <Badge color="gray" variant="light">
                          场景 {sceneCount}
                        </Badge>
                      </Group>
                    </Group>

                    <Paper withBorder p="sm" radius="md" className="summary-panel">
                      {characterNames.length === 0 && sceneSummaries.length === 0 ? (
                        <Text size="sm" c="dimmed">
                          生成后将显示识别出的角色和场景
                        </Text>
                      ) : (
                        <Stack gap="xs">
                          <Group gap="xs" align="flex-start">
                            <Text size="sm" fw={600}>
                              角色
                            </Text>
                            <Group gap={6}>
                              {characterNames.map((name) => (
                                <Badge key={name} color="teal" variant="light">
                                  {name}
                                </Badge>
                              ))}
                            </Group>
                          </Group>

                          <Group gap="xs" align="flex-start">
                            <Text size="sm" fw={600}>
                              场景
                            </Text>
                            <Group gap={6}>
                              {sceneSummaries.map((summary) => (
                                <Badge key={summary} color="gray" variant="light">
                                  {summary}
                                </Badge>
                              ))}
                            </Group>
                          </Group>
                        </Stack>
                      )}
                    </Paper>

                    {chapterSummaries.length > 0 && (
                      <Paper withBorder p="sm" radius="md" className="summary-panel">
                        <Stack gap="xs">
                          <SegmentedControl
                            fullWidth
                            value={selectedChapter}
                            onChange={setSelectedChapter}
                            data={[
                              { value: "all", label: "全部剧本" },
                              ...chapterSummaries.map((chapter) => ({
                                value: chapter.value,
                                label: chapter.label,
                              })),
                            ]}
                          />

                          {selectedChapterSummary ? (
                            <Stack gap={6}>
                              <Group justify="space-between" gap="xs">
                                <Text size="sm" fw={700}>
                                  {selectedChapterSummary.title}
                                </Text>
                                <Badge variant="light" color="blue">
                                  章节摘要
                                </Badge>
                              </Group>
                              <Text size="sm" c="dimmed">
                                {selectedChapterSummary.summary}
                              </Text>
                              <Group gap={6}>
                                <Text size="sm" fw={600}>
                                  本章角色
                                </Text>
                                {selectedChapterSummary.characters.length > 0 ? (
                                  selectedChapterSummary.characters.map((name) => (
                                    <Badge key={name} color="teal" variant="light">
                                      {name}
                                    </Badge>
                                  ))
                                ) : (
                                  <Text size="sm" c="dimmed">
                                    待补充
                                  </Text>
                                )}
                              </Group>
                              <Group gap={6}>
                                <Text size="sm" fw={600}>
                                  本章场景
                                </Text>
                                {selectedChapterSummary.scenes.length > 0 ? (
                                  selectedChapterSummary.scenes.map((scene) => (
                                    <Badge key={scene} color="gray" variant="light">
                                      {scene}
                                    </Badge>
                                  ))
                                ) : (
                                  <Text size="sm" c="dimmed">
                                    待补充
                                  </Text>
                                )}
                              </Group>
                            </Stack>
                          ) : (
                            <Text size="sm" c="dimmed">
                              当前显示完整 YAML，可切换章节查看单章摘要，但编辑区保持完整结构。
                            </Text>
                          )}
                        </Stack>
                      </Paper>
                    )}

                    <Tabs value={activeRightTab} onChange={setActiveRightTab} className="right-panel-tabs">
                      <Tabs.List grow>
                        <Tabs.Tab value="preview">YAML 预览</Tabs.Tab>
                        <Tabs.Tab value="edit">YAML 编辑</Tabs.Tab>
                        <Tabs.Tab value="polish">打磨建议</Tabs.Tab>
                      </Tabs.List>

                      <Tabs.Panel value="preview" pt="sm">
                        <Paper withBorder p="sm" radius="md" className="code-preview-panel">
                          <Stack gap="xs">
                            <Group justify="space-between">
                              <Group gap="xs">
                                <IconFileCode size={18} />
                                <Text size="sm" fw={700}>
                                  YAML 结构预览
                                </Text>
                              </Group>
                              <Group gap={6}>
                                <Badge color="blue" variant="light">
                                  标题/摘要
                                </Badge>
                                <Badge color="orange" variant="light">
                                  角色/对白
                                </Badge>
                                <Badge color="green" variant="light">
                                  场景/动作
                                </Badge>
                              </Group>
                            </Group>

                            <div className="yaml-code-viewer">
                              {highlightedYamlLines.map((line) => (
                                <div
                                  key={line.lineNumber}
                                  className={
                                    selectedPolishLocator?.keys.includes(line.key)
                                      ? "yaml-code-line yaml-code-line-located"
                                      : "yaml-code-line"
                                  }
                                >
                                  <span className="yaml-line-number">{line.lineNumber}</span>
                                  <code className="yaml-line-content">
                                    {line.key ? (
                                      <>
                                        <span>{line.beforeKey}</span>
                                        <span className={line.keyClassName}>{line.key}</span>
                                        <span>{line.afterKey}</span>
                                      </>
                                    ) : (
                                      line.raw || " "
                                    )}
                                  </code>
                                </div>
                              ))}
                            </div>
                          </Stack>
                        </Paper>
                      </Tabs.Panel>

                      <Tabs.Panel value="edit" pt="sm">
                        <Textarea
                          value={yamlDraft}
                          onChange={(event) => {
                            const nextYaml = event.currentTarget.value;
                            setYamlDraft(nextYaml);
                            setYamlStatus(analyzeYamlText(nextYaml));
                            setPolishSuggestions([]);
                            setPolishSource("");
                            setSelectedPolishIndex(null);
                          }}
                          minRows={22}
                          styles={{
                            input: {
                              fontFamily: "Consolas, monospace",
                              height: 620,
                              overflowY: "auto",
                              resize: "vertical",
                            },
                          }}
                        />
                      </Tabs.Panel>

                      <Tabs.Panel value="polish" pt="sm">
                        {polishSuggestions.length > 0 ? (
                          <Paper withBorder p="sm" radius="md" className="summary-panel">
                            <Stack gap="xs">
                              <Group justify="space-between">
                                <Group gap="xs">
                                  <IconWand size={18} />
                                  <Text size="sm" fw={700}>
                                    剧本打磨建议
                                  </Text>
                                </Group>
                                <Badge color={polishSource === "ai" ? "teal" : "yellow"} variant="light">
                                  {polishSource === "ai" ? "AI 建议" : "规则兜底建议"}
                                </Badge>
                              </Group>

                              {selectedPolishLocator ? (
                                <Paper p="xs" radius="md" className="polish-location-hint">
                                  <Group gap="xs" align="flex-start">
                                    <Badge color={selectedPolishLocator.color} variant="light">
                                      {selectedPolishLocator.label}
                                    </Badge>
                                    <Stack gap={2}>
                                      <Text size="sm" fw={700}>
                                        建议检查位置：
                                        {selectedPolishLocator.path}
                                      </Text>
                                      <Text size="sm" c="dimmed">
                                        {selectedPolishLocator.hint}
                                      </Text>
                                    </Stack>
                                  </Group>
                                </Paper>
                              ) : (
                                <Text size="sm" c="dimmed">
                                  点击任意建议，查看推荐检查的 YAML 位置。
                                </Text>
                              )}

                              <Stack gap={6}>
                                {polishSuggestions.map((item, index) => {
                                  const locator = getPolishLocator(item.category);
                                  const isActive = selectedPolishIndex === index;

                                  return (
                                    <Paper
                                      key={`${item.category}-${item.suggestion}`}
                                      p="xs"
                                      radius="md"
                                      bg="white"
                                      className={
                                        isActive
                                          ? "polish-suggestion-card polish-suggestion-card-active"
                                          : "polish-suggestion-card"
                                      }
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => handleSelectPolishSuggestion(index)}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                          event.preventDefault();
                                          handleSelectPolishSuggestion(index);
                                        }
                                      }}
                                    >
                                      <Stack gap={2}>
                                        <Group justify="space-between" gap="xs" align="flex-start">
                                          <Text size="sm" fw={700}>
                                            {item.category}
                                          </Text>
                                          <Group gap={6}>
                                            <Badge color={locator.color} variant="light">
                                              {locator.label}
                                            </Badge>
                                            <Badge color="gray" variant="outline">
                                              {locator.path}
                                            </Badge>
                                          </Group>
                                        </Group>
                                        <Text size="sm" c="dimmed">
                                          {item.suggestion}
                                        </Text>
                                      </Stack>
                                    </Paper>
                                  );
                                })}
                              </Stack>
                            </Stack>
                          </Paper>
                        ) : (
                          <Paper withBorder p="sm" radius="md" className="summary-panel">
                            <Group gap="xs">
                              <IconWand size={18} />
                              <Text size="sm" c="dimmed">
                                生成打磨建议后将在这里显示修改方向。
                              </Text>
                            </Group>
                          </Paper>
                        )}
                      </Tabs.Panel>
                    </Tabs>

                    <Alert
                      icon={
                        yamlStatus.valid && !errorMessage ? (
                          <IconCircleCheck size={18} />
                        ) : (
                          <IconAlertCircle size={18} />
                        )
                      }
                      color={feedbackColor}
                      variant="light"
                      radius="md"
                    >
                      {feedbackMessage}
                    </Alert>

                    <Group justify="flex-end">
                      <Button
                        variant="light"
                        leftSection={<IconWand size={16} />}
                        loading={isGeneratingPolish}
                        onClick={handleGeneratePolishSuggestions}
                      >
                        打磨建议
                      </Button>
                      <Button
                        variant="light"
                        leftSection={<IconSettingsCheck size={16} />}
                        loading={isCheckingYaml}
                        onClick={handleCheckYaml}
                      >
                        校验 YAML
                      </Button>
                      <Button variant="light" leftSection={<IconCopy size={16} />} onClick={handleCopyYaml}>
                        复制 YAML
                      </Button>
                      <Button
                        variant="filled"
                        leftSection={<IconDownload size={18} />}
                        onClick={handleDownloadYaml}
                      >
                        下载 YAML
                      </Button>
                    </Group>
                    </Stack>
                  </Paper>
                </Grid.Col>
              </Grid>

              <Paper className="footer-panel" p="md" radius="md">
                <Group justify="space-between" gap="md">
                  <Text size="sm" c="dimmed">
                    2026 XEngineer 暑期实训营作品 · React / Mantine / FastAPI / DeepSeek
                  </Text>
                  <Group gap="xs">
                    <Badge color="gray" variant="light">
                      多章节输入
                    </Badge>
                    <Badge color="gray" variant="light">
                      YAML 初稿
                    </Badge>
                    <Badge color="gray" variant="light">
                      作者可编辑
                    </Badge>
                  </Group>
                </Group>
              </Paper>
            </Stack>
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
