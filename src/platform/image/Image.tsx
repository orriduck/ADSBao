import {
  forwardRef,
  type ImgHTMLAttributes,
} from "react";

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | { src?: string };
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  unoptimized?: boolean;
};

const Image = forwardRef<HTMLImageElement, ImageProps>(function Image(
  {
    src,
    fill,
    priority: _priority,
    quality: _quality,
    unoptimized: _unoptimized,
    style,
    ...props
  },
  ref,
) {
  const resolvedSrc = typeof src === "string" ? src : src?.src || "";
  return (
    <img
      ref={ref}
      src={resolvedSrc}
      style={
        fill
          ? {
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              ...style,
            }
          : style
      }
      {...props}
    />
  );
});

export default Image;
