import Csv from "./papaparse.js";

// TODO: row count

export class SuperTable extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const superTable = this;
    let actionTable = this.querySelector('action-table');
    const table = this.querySelector('table');
    if (!actionTable) {
      if (!table) return;
      this.append(this.createTable(table));
      actionTable = this.querySelector('action-table');
    }
    const controls = actionTable.querySelector('form.controls');
    if (!controls) return;
    controls.copy.addEventListener('click', async (e) => {
      const csv = superTable.getCsv();
      try {
        await navigator.clipboard.writeText(csv);
        alert('Copied data to clipboard');
      } catch {
        alert('Failed to copy data to clipboard');
      }
    });

    actionTable.addEventListener('focusout', (e) => {
      if (!event.target.contentEditable) return;
      setTimeout(() => {
        const changeEvent = new Event('super-table-updated', { bubbles: true });
        superTable.dispatchEvent(changeEvent);
      }, 0);
    });

    actionTable.addEventListener('action-table-update', (e) => {
      setTimeout(() => {
        const changeEvent = new Event('super-table-updated', { bubbles: true });
        superTable.dispatchEvent(changeEvent);
      }, 0);
    });

    controls.download.addEventListener('click', (e) => {
      const csv = superTable.getCsv();
      // todo: choose TSV?
      var blob = new Blob([csv], { 'type': 'text/csv' });
      var a = this.ownerDocument.createElement('a');
      a.href = this.ownerDocument.defaultView.URL.createObjectURL(blob);
      const filename = this.closest('[data-filename]')?.dataset.filename || 'data';
      a.download = filename + '.csv';
      a.click();
      setTimeout(() => this.ownerDocument.defaultView.URL.revokeObjectURL(a.href), 0);
    });

    controls.add_row.addEventListener('click', (e) => {
      const actionTable = e.target.closest('action-table');
      const table = actionTable.querySelector('table');
      const ths = table.querySelectorAll('thead th');
      const headers = [...ths].map((el) => el.textContent);

      const cec = (name) => (text) => {
        const el = this.ownerDocument.createElement(name);
        if (text) el.textContent = text;
        return el;
      }

      const dialog = superTable.createDialog(...headers.map(header => {
        const label = cec('label')(header);
        const input = cec('input')();
        input.setAttribute('type', 'text');
        label.append(' ', input);
        return label;
      }));

      const form = dialog.querySelector('form');
      form.addEventListener('submit', (e) => {
        const fields = e.target.querySelectorAll('input[type="text"]');
        const tr = cec('tr')();
        // make sure action-table knows about the row
        actionTable.rows.push(tr);
        tr.append(...[...fields].map((el) => cec('td')(el.value)));
        table.querySelector('tbody').append(tr);
        // make sure action-table knows something changed
        const changeEvent = new Event('action-table-update', { bubbles: true });
        tr.firstChild.dispatchEvent(changeEvent);
        form.reset();
        fields[0].focus();
      });

      this.ownerDocument.body.append(dialog);
      dialog.showModal();
    });

    controls.edit.addEventListener('click', (e) => {
      const actionTable = e.target.closest('action-table');
      const table = actionTable.querySelector('table');
      const isEdit = actionTable.classList.toggle('editing');
      const contentEditableValue = (isEdit) ? 'plaintext-only' : false;
      for (let cell of table.querySelectorAll('th, td')) {
        while (cell.children.length) cell = cell.children[0];
        cell.contentEditable = contentEditableValue;
      }
    });
  }

  getDataInternal(query) {
    const table = this.querySelector('table');
    if (!table) return;
    const data = [];
    for (const row of table.querySelectorAll(`:is(${query}) > tr`)) {
      data.push([...row.children].map((el) => el.textContent));
    }
    return data;
  }

  getHeaderData() {
    return this.getDataInternal('thead')[0];
  }

  getBodyData() {
    return this.getDataInternal('tbody');
  }

  getData() {
    return this.getDataInternal('thead, tbody');
  }

  getCsv() {
    const data = this.getData();
    // todo: choose TSV?
    return Csv.unparse(data);
  }

  createTable(table) {
    const actionTable = this.ownerDocument.importNode(
      actionTableTemplate.content,
      true
    );
    actionTable.querySelector('slot').replaceWith(table);
    return actionTable;
  }

  createDialog(...inputs) {
    const dialogFragment = this.ownerDocument.importNode(
      dialogTemplate.content,
      true
    );
    const dialog = dialogFragment.querySelector('dialog');
    dialog.addEventListener('close', (e) => e.target.remove());
    dialog.querySelector('[name=done]').addEventListener('click', (e) => {
      e.target.closest('dialog').close();
    });
    dialog.querySelector('slot').replaceWith(...inputs);
    return dialog;
  }
}

const actionTableTemplate = window.document.createElement('template');
actionTableTemplate.innerHTML = `
  <action-table>
    <div class="title">
      <action-table-filters>
        <input type="search" name="action-table" placeholder="🔍" aria-label="search table"/>
      </action-table-filters>
    </div>
    <div class="scroller">
      <slot></slot>
    </div>
    <action-table-no-results>
      No results matched.
    </action-table-no-results>
    <form class="controls" action="javascript:void(0);">
      <button name="copy" aria-label="copy table to clipboard"><svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 448 512"><!--!Font Awesome Free v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path d="M192 0c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-200.6c0-17.4-7.1-34.1-19.7-46.2L370.6 17.8C358.7 6.4 342.8 0 326.3 0L192 0zM64 128c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-16-64 0 0 16-192 0 0-256 16 0 0-64-16 0z"/></svg></button>
      <button name="download" aria-label="download table"><svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 448 512"><!--!Font Awesome Free v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path d="M256 32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 210.7-41.4-41.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l96 96c12.5 12.5 32.8 12.5 45.3 0l96-96c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 242.7 256 32zM64 320c-35.3 0-64 28.7-64 64l0 32c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-32c0-35.3-28.7-64-64-64l-46.9 0-56.6 56.6c-31.2 31.2-81.9 31.2-113.1 0L110.9 320 64 320zm304 56a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"/></svg></button>
      <button name="add_row" aria-label="add row"><svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 448 512"><!--!Font Awesome Free v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path d="M256 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 160-160 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l160 0 0 160c0 17.7 14.3 32 32 32s32-14.3 32-32l0-160 160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-160 0 0-160z"/></svg></button>
      <button name="edit" aria-label="toggle edit table"><svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 512 512"><!--!Font Awesome Free v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path d="M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L368 46.1 465.9 144 490.3 119.6c21.9-21.9 21.9-57.3 0-79.2L471.6 21.7zm-299.2 220c-6.1 6.1-10.8 13.6-13.5 21.9l-29.6 88.8c-2.9 8.6-.6 18.1 5.8 24.6s15.9 8.7 24.6 5.8l88.8-29.6c8.2-2.7 15.7-7.4 21.9-13.5L432 177.9 334.1 80 172.4 241.7zM96 64C43 64 0 107 0 160L0 416c0 53 43 96 96 96l256 0c53 0 96-43 96-96l0-96c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 96c0 17.7-14.3 32-32 32L96 448c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l96 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 64z"/></svg></button>
      <label class="expanded button" aria-label="expand or contract table"><input type="checkbox" style="display: none" /></label>
    </form>
  </action-table>
`;

const dialogTemplate = window.document.createElement('template');
dialogTemplate.innerHTML = `
  <dialog closedby="any">
    <form action="javascript:void(0);">
      <slot></slot>
      <button name="add">Add</button>
      <button name="done" type="button">Done</button>
    </form>
  </dialog>
`;

window.customElements.define('super-table', SuperTable);
