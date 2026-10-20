import {
  PageLayoutTabLayoutMode,
  PageLayoutWidgetVerticalListHeightBehavior,
} from 'twenty-sdk/define';

// One full-page tab with the section's front component
export const buildDocflowTab = ({
  universalIdentifier,
  widgetUniversalIdentifier,
  frontComponentUniversalIdentifier,
  title,
  icon,
  position,
}: {
  universalIdentifier: string;
  widgetUniversalIdentifier: string;
  frontComponentUniversalIdentifier: string;
  title: string;
  icon: string;
  position: number;
}) => ({
  universalIdentifier,
  title,
  position,
  icon,
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: widgetUniversalIdentifier,
      title: ' ',
      type: 'FRONT_COMPONENT' as const,
      heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
      configuration: {
        configurationType: 'FRONT_COMPONENT' as const,
        frontComponentUniversalIdentifier,
      },
    },
  ],
});
