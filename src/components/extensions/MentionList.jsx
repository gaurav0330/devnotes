import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

export default forwardRef((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = index => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.slug, label: item.title });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }
      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }
      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  if (!props.items || props.items.length === 0) {
    return (
      <div className="bg-popover border border-border/50 rounded-lg shadow-lg p-2 text-sm text-muted-foreground z-50">
        No notes found
      </div>
    );
  }

  return (
    <div className="bg-popover border border-border/50 rounded-lg shadow-xl overflow-hidden py-1 w-64 z-50">
      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 border-b border-border/30 bg-muted/20">
        Link to note
      </div>
      {props.items.map((item, index) => (
        <button
          className={`w-full text-left px-3 py-2 text-sm flex flex-col items-start gap-0.5 transition-colors ${
            index === selectedIndex ? 'bg-primary/10 text-primary' : 'bg-transparent text-foreground hover:bg-muted'
          }`}
          key={index}
          onClick={() => selectItem(index)}
        >
          <span className="font-semibold">{item.title}</span>
          <span className="text-[10px] opacity-70 text-muted-foreground truncate w-full">{item.slug}</span>
        </button>
      ))}
    </div>
  );
});
