export default function MobileTopNav({ left, right }) {
  return (
    <div className="mobile-top-nav hidden items-center justify-between max-[720px]:flex">
      <div className="min-w-0">{left}</div>
      <div className="min-w-0">{right}</div>
    </div>
  );
}
