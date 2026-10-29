import { BiInfoCircle } from 'react-icons/bi';
import { css } from 'styled-system/css';
import { Tooltip } from '~/components/ui/tooltip';

export function InfoTooltip({ text, label = 'Information' }: { text: string; label?: string }) {
  return (
    <Tooltip.Root openDelay={100} closeDelay={100} positioning={{ placement: 'top' }}>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className={css({
            cursor: 'pointer',
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
            rounded: 'full',
            p: '0.5',
            color: 'fg.muted',
            transition: 'color 0.15s ease',
            _focusVisible: { outline: '2px solid', outlineColor: 'colorPalette.default' },
            _hover: { color: 'fg.default' }
          })}
        >
          <BiInfoCircle size={14} />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content
          className={css({
            zIndex: 100,
            borderColor: 'border.default',
            rounded: 'lg',
            borderWidth: '1px',
            maxW: '280px',
            p: '2.5',
            color: 'fg.default',
            fontSize: 'xs',
            lineHeight: '1.45',
            bg: 'bg.default',
            boxShadow: 'lg'
          })}
        >
          <Tooltip.Arrow>
            <Tooltip.ArrowTip />
          </Tooltip.Arrow>
          {text}
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  );
}
