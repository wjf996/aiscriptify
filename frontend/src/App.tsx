import {
  Alert,
  AppShell,
  Badge,
  Button,
  Container,
  Grid,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCircleCheck,
  IconDownload,
  IconFileText,
  IconPlayerPlay,
  IconSparkles,
} from "@tabler/icons-react";
import { useState } from "react";

import { ScriptStyle, convertNovel, validateChapters, validateYaml } from "./api";

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

type YamlStatus = {
  valid: boolean;
  message: string;
};

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

function App() {
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState<ScriptStyle>("screenplay");
  const [novelText, setNovelText] = useState("");
  const [chapterCount, setChapterCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [sceneCount, setSceneCount] = useState(0);
  const [characterNames, setCharacterNames] = useState<string[]>([]);
  const [sceneSummaries, setSceneSummaries] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState("等待输入小说文本");
  const [errorMessage, setErrorMessage] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isCheckingYaml, setIsCheckingYaml] = useState(false);
  const [yamlDraft, setYamlDraft] = useState(sampleYaml);
  const [yamlStatus, setYamlStatus] = useState<YamlStatus>(analyzeYamlText(sampleYaml));

  const handleValidate = async () => {
    setErrorMessage("");
    setStatusMessage("正在校验章节并调用 AI...");
    setIsValidating(true);

    try {
      const validation = await validateChapters({ title, text: novelText, style });
      setChapterCount(validation.chapter_count);

      if (!validation.valid) {
        setCharacterCount(0);
        setSceneCount(0);
        setCharacterNames([]);
        setSceneSummaries([]);
        setStatusMessage(validation.message);
        setErrorMessage(validation.message);
        return;
      }

      const result = await convertNovel({ title, text: novelText, style });
      setChapterCount(result.chapter_count);
      setCharacterCount(result.character_count);
      setSceneCount(result.scene_count);
      setCharacterNames(result.character_names);
      setSceneSummaries(result.scene_summaries);
      setYamlDraft(result.yaml);
      setYamlStatus({
        valid: result.yaml_valid,
        message: result.yaml_valid
          ? "YAML 基础结构有效，可继续编辑和打磨"
          : result.yaml_error || "YAML 校验未通过",
      });
      setStatusMessage(
        result.warnings.length > 0
          ? result.warnings[0]
          : "YAML 剧本初稿生成完成，可继续编辑和打磨",
      );
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

  const handleDownloadYaml = () => {
    const blob = new Blob([yamlDraft], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = title.trim() || "aiscriptify-script";

    link.href = url;
    link.download = `${safeTitle}.yaml`;
    link.click();
    URL.revokeObjectURL(url);
    setStatusMessage("已下载当前 YAML 内容");
  };

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between">
            <Group gap="sm">
              <IconSparkles size={24} />
              <Title order={3}>aiscriptify</Title>
            </Group>
            <Badge variant="light" color="teal">
              小说转剧本 YAML
            </Badge>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl">
          <Stack gap="lg">
            <Stack gap={4}>
              <Title order={2}>AI 小说转剧本工具</Title>
              <Text c="dimmed">
                输入 3 个章节以上的小说文本，生成可编辑、可继续打磨的 YAML 剧本初稿。
              </Text>
            </Stack>

            <Alert icon={<IconFileText size={18} />} color="blue" variant="light">
              当前 PR 生成可编辑 YAML 剧本初稿，并支持复制和下载当前编辑内容。
            </Alert>

            {errorMessage && (
              <Alert icon={<IconAlertCircle size={18} />} color="red" variant="light">
                {errorMessage}
              </Alert>
            )}

            <Grid gutter="lg">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper withBorder p="md" radius="md">
                  <Stack>
                    <Group justify="space-between">
                      <Title order={4}>小说输入</Title>
                      <Badge variant="outline">至少 3 章</Badge>
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

                    <Textarea
                      label="小说文本"
                      placeholder="请粘贴至少 3 个章节的小说文本..."
                      value={novelText}
                      onChange={(event) => setNovelText(event.currentTarget.value)}
                      autosize
                      minRows={14}
                    />

                    <Group justify="flex-end">
                      <Button variant="light" onClick={() => setNovelText(sampleNovel)}>
                        填充示例
                      </Button>
                      <Button
                        leftSection={<IconPlayerPlay size={18} />}
                        loading={isValidating}
                        onClick={handleValidate}
                      >
                        生成剧本 YAML
                      </Button>
                    </Group>
                  </Stack>
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper withBorder p="md" radius="md">
                  <Stack>
                    <Group justify="space-between">
                      <Title order={4}>剧本 YAML 初稿</Title>
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

                    <Paper withBorder p="sm" radius="md" bg="gray.0">
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

                    <Textarea
                      value={yamlDraft}
                      onChange={(event) => {
                        const nextYaml = event.currentTarget.value;
                        setYamlDraft(nextYaml);
                        setYamlStatus(analyzeYamlText(nextYaml));
                      }}
                      autosize
                      minRows={18}
                      styles={{ input: { fontFamily: "Consolas, monospace" } }}
                    />

                    <Alert
                      icon={
                        yamlStatus.valid ? (
                          <IconCircleCheck size={18} />
                        ) : (
                          <IconAlertCircle size={18} />
                        )
                      }
                      color={yamlStatus.valid ? "teal" : "yellow"}
                      variant="light"
                    >
                      {yamlStatus.message}
                    </Alert>

                    <Alert color={errorMessage ? "red" : "teal"} variant="light">
                      {statusMessage}
                    </Alert>

                    <Group justify="flex-end">
                      <Button variant="light" loading={isCheckingYaml} onClick={handleCheckYaml}>
                        校验 YAML
                      </Button>
                      <Button variant="light" onClick={handleCopyYaml}>
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
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
