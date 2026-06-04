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
import { IconFileText, IconPlayerPlay, IconSparkles } from "@tabler/icons-react";

const sampleYaml = `title: 待生成剧本
script_type: screenplay
characters: []
chapters: []`;

function App() {
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
              当前 PR 仅搭建前端基础页面，生成逻辑会在后续 PR 接入。
            </Alert>

            <Grid gutter="lg">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper withBorder p="md" radius="md">
                  <Stack>
                    <Group justify="space-between">
                      <Title order={4}>小说输入</Title>
                      <Badge variant="outline">至少 3 章</Badge>
                    </Group>

                    <TextInput label="作品标题" placeholder="请输入小说标题" />

                    <Select
                      label="剧本类型"
                      placeholder="请选择剧本类型"
                      defaultValue="screenplay"
                      data={[
                        { value: "screenplay", label: "影视剧" },
                        { value: "short_drama", label: "短剧" },
                        { value: "audio_drama", label: "广播剧" },
                      ]}
                    />

                    <Textarea
                      label="小说文本"
                      placeholder="请粘贴至少 3 个章节的小说文本..."
                      autosize
                      minRows={14}
                    />

                    <Group justify="flex-end">
                      <Button variant="light">填充示例</Button>
                      <Button leftSection={<IconPlayerPlay size={18} />}>生成剧本 YAML</Button>
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
                          章节 0
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
                      value={sampleYaml}
                      readOnly
                      autosize
                      minRows={18}
                      styles={{ input: { fontFamily: "Consolas, monospace" } }}
                    />

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
