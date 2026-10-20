import { type ReactNode } from 'react';
import { useTheme } from 'twenty-ui/theme';

import { MESSENGER_STYLE_SHEET } from 'src/front/ui/styles';

export const MessengerRoot = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();

  return (
    <div
      className="nd-messenger"
      style={{ color: theme.font.color.primary, fontSize: theme.font.size.md }}
    >
      <style>{MESSENGER_STYLE_SHEET}</style>
      {children}
    </div>
  );
};

export const Message = ({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: 'muted' | 'danger';
}) => {
  const theme = useTheme();

  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      style={{
        color:
          tone === 'danger'
            ? theme.font.color.danger
            : theme.font.color.tertiary,
        fontSize: theme.font.size.sm,
        padding:
          tone === 'muted'
            ? theme.spacing[6]
            : `${theme.spacing[1]} ${theme.spacing[4]}`,
        textAlign: tone === 'muted' ? 'center' : 'left',
      }}
    >
      {children}
    </div>
  );
};

export const ForkEngineNotice = () => (
  <Message>Беседы этой компании ведёт NorDiv: откройте раздел «Чаты».</Message>
);
