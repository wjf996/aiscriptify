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
  IconDownload,
  IconFileText,
  IconPlayerPlay,
  IconSparkles,
} from "@tabler/icons-react";
import { useState } from "react";

import { ScriptStyle, convertNovel, validateChapters } from "./api";

const sampleYaml = `title: 待生成剧本
script_type: screenplay
characters: []
chapters: []`;

const sampleNovel = `第一章 办公室
张三在办公室整理文件，李四突然进来寻找报告，经理王五随后出现调解。

第二章 公园
张三在公园散心，遇到李四。两人谈起白天的误会，并决定和解。

第三章 会议室
王五在会议上表扬张三和李四，团队重新恢复合作。`;

function App() {
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState<ScriptStyle>("screenplay");
  const [novelText, setNovelText] = useState("");
  const [chapterCount, setChapterCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState("等待输入小说文本");
  const [errorMessage, setErrorMessage] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [yamlDraft, setYamlDraft] = useState(sampleYaml);

  const handleValidate = async () => {
    setErrorMessage("");
    setStatusMessage("正在校验章节并调用 AI...");
    setIsValidating(true);

    try {
      const validation = await validateChapters({ title, text: novelText, style });
      setChapterCount(validation.chapter_count);

      if (!validation.valid) {
        setStatusMessage(validation.message);
        setErrorMessage(validation.message);
        return;
      }

      const result = await convertNovel({ title, text: novelText, style });
      setChapterCount(result.chapter_count);
      setYamlDraft(result.yaml);
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
                          角色 0
                        </Badge>
                        <Badge color="gray" variant="light">
                          场景 0
                        </Badge>
                      </Group>
                    </Group>

                    <Textarea
                      value={yamlDraft}
                      onChange={(event) => setYamlDraft(event.currentTarget.value)}
                      autosize
                      minRows={18}
                      styles={{ input: { fontFamily: "Consolas, monospace" } }}
                    />

                    <Alert color={errorMessage ? "red" : "teal"} variant="light">
                      {statusMessage}
                    </Alert>

                    <Group justify="flex-end">
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
