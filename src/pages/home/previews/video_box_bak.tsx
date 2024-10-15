import {
  Flex,
  VStack,
  Image,
  Anchor,
  Tooltip,
  HStack,
  Switch,
  Text,
  Box,
} from "@hope-ui/solid"
import { For, JSXElement } from "solid-js"
import { useRouter, useLink, useT } from "~/hooks"
import { objStore } from "~/store"
import { ObjType } from "~/types"
import { convertURL } from "~/utils"
import Artplayer from "artplayer"

// 设置 Artplayer 的播放速率选项
Artplayer.PLAYBACK_RATE = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]

// 定义支持的外部播放器列表
export const players: { icon: string; name: string; scheme: string }[] = [
  { icon: "iina", name: "IINA", scheme: "iina://weblink?url=$edurl" },
  { icon: "potplayer", name: "PotPlayer", scheme: "potplayer://$durl" },
  { icon: "vlc", name: "VLC", scheme: "vlc://$durl" },
  { icon: "nplayer", name: "nPlayer", scheme: "nplayer-$durl" },
  {
    icon: "omniplayer",
    name: "OmniPlayer",
    scheme: "omniplayer://weblink?url=$durl",
  },
  {
    icon: "figplayer",
    name: "Fig Player",
    scheme: "figplayer://weblink?url=$durl",
  },
  {
    icon: "infuse",
    name: "Infuse",
    scheme: "infuse://x-callback-url/play?url=$durl",
  },
  {
    icon: "fileball",
    name: "Fileball",
    scheme: "filebox://play?url=$durl",
  },
  {
    icon: "mxplayer",
    name: "MX Player",
    scheme:
      "intent:$durl#Intent;package=com.mxtech.videoplayer.ad;S.title=$name;end",
  },
  {
    icon: "mxplayer-pro",
    name: "MX Player Pro",
    scheme:
      "intent:$durl#Intent;package=com.mxtech.videoplayer.pro;S.title=$name;end",
  },
]

// Artplayer 的自动高度调整插件
export const AutoHeightPlugin = (player: Artplayer) => {
  const { $container, $video } = player.template
  const $videoBox = $container.parentElement!

  player.on("ready", () => {
    // 设置视频容器的最大高度和最小高度
    const offsetBottom = "1.75rem" // "更多"按钮的底部位置 + padding
    $videoBox.style.maxHeight = `calc(100vh - ${$videoBox.offsetTop}px - ${offsetBottom})`
    $videoBox.style.minHeight = "320px" // 移动设备的最小宽度
    player.autoHeight()
  })
  player.on("resize", () => {
    player.autoHeight()
  })
  player.on("error", () => {
    if ($video.style.height) return
    $container.style.height = "60vh"
    $video.style.height = "100%"
  })
}

// 辅助函数：去除文件后缀并限制长度
const formatVideoName = (name: string) => {
  // 去除文件后缀
  const nameWithoutExt = name.replace(/\.[^/.]+$/, "")
  // 限制长度为16个字符，超出部分用省略号替代
  return nameWithoutExt.length > 16
    ? nameWithoutExt.slice(0, 20) + "..."
    : nameWithoutExt
}

// 视频播放器组件
export const VideoBox = (props: {
  children: JSXElement
  onAutoNextChange: (v: boolean) => void
}) => {
  const { replace } = useRouter()
  const { currentObjLink } = useLink()
  // 获取当前目录下的所有视频文件
  let videos = objStore.objs.filter((obj) => obj.type === ObjType.VIDEO)
  if (videos.length === 0) {
    videos = [objStore.obj]
  }
  const t = useT()
  // 获取自动播放下一个视频的设置
  let autoNext = localStorage.getItem("video_auto_next")
  if (!autoNext) {
    autoNext = "true"
  }
  props.onAutoNextChange(autoNext === "true")

  // 获取当前播放视频的序号
  const currentVideoIndex =
    videos.findIndex((video) => video.name === objStore.obj.name) + 1

  return (
    <Flex w="$full" direction="column" maxH="calc(100vh - 64px)">
      <Flex w="$full" flex={1} minH="0">
        {/* 左侧视频播放器 */}
        <Box flex={1} minW="0" h="100%" id="video-player-container">
          {props.children}
        </Box>

        {/* 右侧视频列表和控制 */}
        <VStack
          w="250px"
          h="450px"
          ml="$2"
          spacing="$2"
          flexShrink={0}
          overflow="hidden"
        >
          {/* 视频选集标题和自动播放开关 */}
          <HStack w="$full" justifyContent="space-between" alignItems="center">
            <Text fontWeight="bold">
              视频选集 ({currentVideoIndex}/{videos.length})
            </Text>
            <HStack spacing="$2">
              <Text fontSize="$sm">{t("home.preview.auto_next")}</Text>
              <Switch
                defaultChecked={autoNext === "true"}
                onChange={(e) => {
                  props.onAutoNextChange(e.currentTarget.checked)
                  localStorage.setItem(
                    "video_auto_next",
                    e.currentTarget.checked.toString(),
                  )
                }}
              />
            </HStack>
          </HStack>

          {/* 视频选择列表 */}
          <Box
            flex={1}
            overflowY="auto"
            w="$full"
            borderWidth="1px"
            borderColor="$neutral6"
            borderRadius="$md"
          >
            <For each={videos}>
              {(video) => (
                <Box
                  py="$1"
                  px="$2"
                  cursor="pointer"
                  _hover={{ bg: "$neutral4" }}
                  onClick={() => replace(video.name)}
                  bg={
                    video.name === objStore.obj.name
                      ? "$neutral3"
                      : "transparent"
                  }
                >
                  <Tooltip label={video.name} placement="left">
                    <Text fontSize="$sm" noOfLines={1}>
                      {formatVideoName(video.name)}
                    </Text>
                  </Tooltip>
                </Box>
              )}
            </For>
          </Box>
        </VStack>
      </Flex>

      {/* 外部播放器列表 */}
      <Flex wrap="wrap" gap="$1" justifyContent="center" mt="$2">
        <For each={players}>
          {(item) => {
            return (
              <Tooltip placement="top" withArrow label={item.name}>
                <Anchor
                  href={convertURL(item.scheme, {
                    raw_url: objStore.raw_url,
                    name: objStore.obj.name,
                    d_url: currentObjLink(true),
                  })}
                >
                  <Image
                    m="0 auto"
                    boxSize="$6"
                    src={`${window.__dynamic_base__}/images/${item.icon}.webp`}
                  />
                </Anchor>
              </Tooltip>
            )
          }}
        </For>
      </Flex>
    </Flex>
  )
}
