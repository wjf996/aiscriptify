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
import { IconAlertCircle, IconFileText, IconPlayerPlay, IconSparkles } from "@tabler/icons-react";
import { useState } from "react";

import { ScriptStyle, convertNovel, validateChapters } from "./api";

const sampleYaml = `title: 待生成剧本
script_type: screenplay
characters: []
chapters: []`;

const sampleNovel = `第一章 雨夜来信
雨夜里，林夏收到一封没有署名的信。信中提到三年前失踪的好友，也提到城北旧剧院即将重开。

第二章 旧剧院
林夏来到旧剧院，遇见正在排练的导演周远。周远否认认识失踪者，却在后台藏起一张旧合照。

第三章 灯光熄灭
排练开始后，剧院突然停电。黑暗中有人念出失踪者留下的台词，林夏意识到真相被写进了这出戏里。`;

function App() {
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState<ScriptStyle>("screenplay");
  const [novelText, setNovelText] = useState("");
  const [chapterCount, setChapterCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState("等待输入小说文本");
  const [errorMessage, setErrorMessage] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [scriptDraft, setScriptDraft] = useState(sampleYaml);

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
      setScriptDraft(JSON.stringify(result.script, null, 2));
      setStatusMessage("AI 剧本结构生成完成，YAML 生成会在后续 PR 接入");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 转换失败");
      setStatusMessage("转换失败");
    } finally {
      setIsValidating(false);
    }
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
              当前 PR 接入 DeepSeek AI 转换，结果先以结构化 JSON 展示，YAML 生成会在后续 PR 接入。
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
                      value={scriptDraft}
                      readOnly
                      autosize
                      minRows={18}
                      styles={{ input: { fontFamily: "Consolas, monospace" } }}
                    />

                    <Alert color={errorMessage ? "red" : "teal"} variant="light">
                      {statusMessage}
                    </Alert>

                    <Group justify="flex-end">
                      <Button variant="light">复制 YAML</Button>
                      <Button variant="filled">下载 YAML</Button>
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
