declare module 'imagetracerjs' {
  export function imageToSVG(
    url: string,
    callback: (svgString: string) => void,
    options?: any
  ): void;
  export function imageDataToSVG(
    imgd: ImageData,
    callback: (svgString: string) => void,
    options?: any
  ): void;
}
