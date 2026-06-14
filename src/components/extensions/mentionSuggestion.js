import { ReactRenderer } from '@tiptap/react';
import MentionList from './MentionList';
import { getUserNotes } from '@/lib/notes.service';

let cachedNotes = null;
let lastFetch = 0;

export const getSuggestionConfig = (userId) => ({
  char: '[[',
  items: async ({ query }) => {
    if (!userId) return [];
    
    // Fetch if not cached or cache is older than 2 minutes
    if (!cachedNotes || Date.now() - lastFetch > 120000) {
      cachedNotes = await getUserNotes(userId);
      lastFetch = Date.now();
    }
    
    return cachedNotes
      .filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10);
  },
  render: () => {
    let component;
    let popupElement;

    return {
      onStart: props => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popupElement = document.createElement('div');
        popupElement.style.position = 'fixed';
        popupElement.style.zIndex = '9999';
        
        const rect = props.clientRect();
        if (rect) {
          popupElement.style.left = `${rect.left}px`;
          popupElement.style.top = `${rect.bottom + 5}px`;
        }
        
        popupElement.appendChild(component.element);
        document.body.appendChild(popupElement);
      },

      onUpdate(props) {
        component.updateProps(props);

        if (!props.clientRect || !popupElement) {
          return;
        }

        const rect = props.clientRect();
        if (rect) {
          popupElement.style.left = `${rect.left}px`;
          popupElement.style.top = `${rect.bottom + 5}px`;
        }
      },

      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          if (popupElement) {
            popupElement.remove();
            popupElement = null;
          }
          return true;
        }
        return component.ref?.onKeyDown(props);
      },

      onExit() {
        if (popupElement) {
          popupElement.remove();
          popupElement = null;
        }
        if (component) {
          component.destroy();
        }
      },
    };
  },
});
