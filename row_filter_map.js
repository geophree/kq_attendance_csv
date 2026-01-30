import Csv from "./papaparse.js";

class RowFilterMap extends HTMLElement {
  _columns = [];
  _columns_changed = true;

  constructor() {
    super();
  }

  static get observedAttributes() {
    return ['columns', 'value'];
  }

  get columns() {
    return this._columns;
  }

  set columns(val) {
    this._columns = val;
    for (let select of this.querySelectorAll('select')) {
      const newChildren = [...this.createColumnSelect(select.value).children];
      const selected = newChildren.find(e => e.selected);
      select.replaceChildren(...newChildren);
      selected.selected = true;
    }
    this.dispatchEvent(new Event('changed', { bubbles: true }));
    return this._columns
  }

  get value() {
    const val = [];
    for (let li of this.querySelectorAll('li')) {
      const select = li.querySelector('select');
      const input = li.querySelector('input');
      val.push([select.value, input.value]);
    }
    return Csv.unparse(val);
  }

  set value(val) {
    const rows = (typeof val === 'string') ? Csv.parse(val).data : []
    const list = this.querySelector('ol');
    const cli = (row) => this.createListItem(...row);
    list.replaceChildren(...rows.map(cli));
    this.dispatchEvent(new Event('changed', { bubbles: true }));
    return val;
  }

  async attributeChangedCallback(attrName, oldVal, newVal) {
    if (attrName === 'columns') {
      this.columns = (typeof newVal === 'string') ? Csv.parse(newVal).data[0] : [];
    } else if (attrName === 'value') {
      this.value = newVal;
    }
  }

  connectedCallback() {
    if (this.querySelector('ol')) return;

    this.append(this.ownerDocument.importNode(formTemplate.content, true));

    const list = this.querySelector('ol');
    const add_button = this.querySelector('button[name="add"]');

    add_button.addEventListener('click', (e) => {
      e.preventDefault();
      list.append(this.createListItem());
    });
  }

  reset() {
    this.querySelector('ol').replaceChildren();
    this.dispatchEvent(new Event('changed', { bubbles: true }));
  }

  cec(name) {
    return (text) => {
      const el = this.ownerDocument.createElement(name);
      if (text) el.textContent = text;
      return el;
    };
  }

  createListItem(selected, name) {
    const frag = this.ownerDocument.importNode(listItemTemplate.content, true);
    const li = frag.querySelector('li');
    const slot = li.querySelector('slot');
    const column_select = this.createColumnSelect(selected);
    slot.replaceWith(column_select);
    const input = li.querySelector('input');
    const column_change = () => input.placeholder = column_select.value;
    column_select.addEventListener('change', column_change);
    column_change();
    const remove = li.querySelector('button');
    remove.addEventListener('click', (e) => {
      e.preventDefault();
      li.remove();
    });
    if (typeof name === 'string' && name.length > 0) input.value = name;
    return li;
  }

  createColumnSelect(selected) {
    const cec = (...args) => this.cec(...args);

    const column_select = cec('select')();
    if (Array.isArray(selected)) {
      column_select.setAttribute('multiple', '');
    } else if (typeof selected === 'string' && selected.length > 0) {
      selected = [selected];
    }
    column_select.append(...this.columns.map(cec('option')));
    if (Array.isArray(selected)) {
      const options = [...column_select.children];
      const new_options = [];
      for (const sel of selected) {
        if (typeof sel === 'string' && sel.length > 0) {
          let option = options.find((e) => e.textContent === sel);
          if (!option) {
            option = this.cec('option')(sel);
            option.setAttribute('disabled', '');
            new_options.push(option);
          }
          option.setAttribute('selected', '');
        }
      }
      column_select.prepend(...new_options);
    }
    return column_select;
  }

  getMapperAndNames() {
    const columns = this.columns;
    const indexes = [];
    const names = [];

    for (let li of this.querySelectorAll('li')) {
      const select = li.querySelector('select');
      indexes.push(columns.indexOf(select.value));
      const input = li.querySelector('input');
      const input_value = input.value;
      names.push(input_value ? input_value : input.placeholder);
    }
    const mapper = (row) => indexes.map((i) => row[i]);
    return { names, mapper };
  }
}

const formTemplate = window.document.createElement('template');
formTemplate.innerHTML = `
  <ol style="list-style: none;"></ol>
  <button type="button" name="add" aria-label="add"><svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 448 512"><!--!Font Awesome Free v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path d="M256 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 160-160 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l160 0 0 160c0 17.7 14.3 32 32 32s32-14.3 32-32l0-160 160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-160 0 0-160z"/></svg></button>
`;

const listItemTemplate = window.document.createElement('template');
listItemTemplate.innerHTML = `
  <li><slot></slot> renamed to <input /> <button type="button">&#10006;</button></li>
`;

window.customElements.define('row-filter-map', RowFilterMap);
