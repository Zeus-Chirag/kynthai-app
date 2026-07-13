declare module "@remotion/cli/config" {
  export const Config: {
    setVideoImageFormat: (format: string) => {
      [Symbol.unstable_setConfig]: (c: { videoImageFormat: string }) => void
    }
  }
  export default Config
}