import {
  ComponentType,
  createElement,
  lazy,
  Suspense,
  useMemo,
  type ReactNode,
} from "react";

type DynamicOptions<TProps> = {
  loading?: ComponentType<TProps>;
  ssr?: boolean;
};

type Loader<TProps> = () => Promise<
  { default: ComponentType<TProps> } | ComponentType<TProps>
>;

export default function dynamic<TProps extends object>(
  loader: Loader<TProps>,
  options: DynamicOptions<TProps> = {},
) {
  return function DynamicComponent(props: TProps) {
    const LazyComponent = useMemo(
      () =>
        lazy(async () => {
          const mod = await loader();
          return typeof mod === "function" ? { default: mod } : mod;
        }),
      [],
    );
    const fallback = options.loading
      ? createElement(options.loading, props)
      : null;
    return (
      <Suspense fallback={fallback as ReactNode}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
