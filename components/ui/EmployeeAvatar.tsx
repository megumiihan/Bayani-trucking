interface EmployeeAvatarProps {
  name: string;
  photoUrl?: string | null;
  /** Diameter in pixels. */
  size?: number;
  className?: string;
}

export function employeeInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function EmployeeAvatar({
  name,
  photoUrl,
  size = 44,
  className = "",
}: EmployeeAvatarProps) {
  const style = { width: size, height: size };

  if (photoUrl) {
    return (
      // Plain <img>: photos are pre-sized to 256px, so next/image optimization
      // would only add Vercel usage.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        style={style}
        className={`shrink-0 rounded-full bg-gray-100 object-cover ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={name}
      style={{ ...style, fontSize: Math.max(11, Math.round(size * 0.34)) }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-gray-100 font-bold text-gray-600 ${className}`}
    >
      {employeeInitials(name)}
    </div>
  );
}
