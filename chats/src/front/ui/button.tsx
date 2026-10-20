import { type ReactNode, useState } from 'react';
import { type IconComponent } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';

// The app's own button. twenty-ui's Button is built on Base UI, whose focus
// and pointer handlers read event.nativeEvent; in the sandbox of a front
// component events arrive without it and the component crashes ("Cannot use
// 'in' operator to search for 'composedPath'"). Same look, plain element.
type ButtonVariant = 'solid' | 'outline' | 'ghost';

export const Button = ({
  children,
  onClick,
  variant = 'outline',
  size = 'sm',
  tone = 'default',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  title,
}: {
  children?: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  tone?: 'default' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: IconComponent;
  title?: string;
}) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const isInactive = disabled || loading;
  const color =
    tone === 'danger'
      ? theme.font.color.danger
      : variant === 'solid'
        ? theme.font.color.inverted
        : theme.font.color.secondary;
  // Outline buttons are a dense fill of the surface color, not a tint: over a
  // wallpaper skin a see-through button gets lost in the picture.
  const surface = (percent: number) =>
    `color-mix(in srgb, ${theme.background.primary} ${percent}%, transparent)`;
  const background =
    variant === 'solid'
      ? theme.background.invertedPrimary
      : isHovered && !isInactive
        ? variant === 'outline'
          ? surface(94)
          : theme.background.transparent.light
        : variant === 'outline'
          ? surface(80)
          : 'transparent';

  return (
    <button
      type="button"
      title={title}
      disabled={isInactive}
      onClick={() => {
        if (!isInactive) {
          onClick?.();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        alignItems: 'center',
        background,
        border: variant === 'outline' ? `1px solid ${theme.border.color.medium}` : '1px solid transparent',
        borderRadius: theme.border.radius.sm,
        color,
        cursor: isInactive ? 'default' : 'pointer',
        display: 'inline-flex',
        fontFamily: 'inherit',
        fontSize: theme.font.size.md,
        fontWeight: theme.font.weight.medium,
        gap: theme.spacing[1],
        height: size === 'md' ? theme.spacing[8] : theme.spacing[7],
        justifyContent: 'center',
        opacity: isInactive ? 0.55 : variant === 'solid' && isHovered ? 0.88 : 1,
        padding: `0 ${theme.spacing[2]}`,
        whiteSpace: 'nowrap',
        width: fullWidth ? '100%' : undefined,
      }}
    >
      {Icon !== undefined && <Icon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />}
      {loading ? '…' : children}
    </button>
  );
};

