/** Fixed atmospheric backdrop: aurora blooms refracted through the glass. */
export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop__blob backdrop__blob--1" />
      <div className="backdrop__blob backdrop__blob--2" />
      <div className="backdrop__blob backdrop__blob--3" />
    </div>
  );
}
