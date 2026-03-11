function nodeBelongsToExtension(node: Node | null | undefined): boolean {
  if (!node) {
    return false;
  }

  if (node instanceof HTMLElement) {
    return (
      node.id.startsWith('asw-') ||
      node.className
        .split(/\s+/u)
        .some((className) => className.startsWith('asw-')) ||
      Boolean(node.closest('[id^="asw-"], [class^="asw-"], [class*=" asw-"]'))
    );
  }

  if (node instanceof Text) {
    return nodeBelongsToExtension(node.parentElement);
  }

  return false;
}

function shouldIgnoreMutations(records: MutationRecord[]): boolean {
  if (records.length === 0) {
    return true;
  }

  return records.every((record) => {
    if (!record.addedNodes.length && !record.removedNodes.length) {
      return nodeBelongsToExtension(record.target);
    }

    const touchedNodes = [...record.addedNodes, ...record.removedNodes];
    return touchedNodes.every((node) => nodeBelongsToExtension(node));
  });
}

export function createDebouncedObserver(
  targets: Array<Node | null | undefined>,
  callback: () => void,
  delayMs = 250
): MutationObserver {
  let timerId: number | null = null;

  const observer = new MutationObserver((records) => {
    if (shouldIgnoreMutations(records)) {
      return;
    }

    if (timerId !== null) {
      window.clearTimeout(timerId);
    }

    timerId = window.setTimeout(() => {
      callback();
      timerId = null;
    }, delayMs);
  });

  for (const target of targets) {
    if (!target) {
      continue;
    }

    observer.observe(target, {
      childList: true,
      subtree: true
    });
  }

  return observer;
}
