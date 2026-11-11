import { afterEach, describe, expect, it } from 'vitest';
import { isDialogOpen, isInHiddenTree } from './dialog';

describe('isDialogOpen', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is false without dialogs', () => {
    expect(isDialogOpen()).toBe(false);
  });

  it('is true with a visible dialog', () => {
    document.body.innerHTML = '<div role="dialog"></div>';
    expect(isDialogOpen()).toBe(true);
  });

  it('ignores a dialog inside a hidden container, like one playing its exit animation', () => {
    document.body.innerHTML =
      '<div aria-hidden="true"><div role="dialog"></div></div><div inert><div role="dialog"></div></div>';
    expect(isDialogOpen()).toBe(false);
  });
});

describe('isInHiddenTree', () => {
  it('finds a hidden container above the element', () => {
    document.body.innerHTML = '<div inert><button>Ok</button></div><button>Visible</button>';
    const [hidden, visible] = document.querySelectorAll('button');
    expect(hidden && isInHiddenTree(hidden)).toBe(true);
    expect(visible && isInHiddenTree(visible)).toBe(false);
  });
});
