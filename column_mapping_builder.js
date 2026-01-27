import Csv from "./papaparse.js";

class ColumnMappingBuilder extends HTMLElement {
  _columns;
  _columns_changed = true;

  constructor() {
    super();
  }

  static get observedAttributes() {
    return ['columns'];
  }

  get columns() {
    while (this._columns_changed === true) {
      this._columns_changed = false;
      if (!this.hasAttribute('columns')) {
        this._columns = [];
      } else {
        try {
          this._columns = Csv.parse(this.getAttribute('columns')).data[0];
        } catch (e) {
          console.error(e);
          this._columns = [];
        }
      }
    }
    return this._columns;
  }

  set columns(val) {
    if (typeof val === 'string') {
      this.setAttribute('columns', val);
    } else {
      this.setAttribute('columns', Csv.unparse([val]));
    }
  }

  async attributeChangedCallback(attrName, oldVal, newVal) {
    if (attrName === 'columns') {
      this._columns_changed = true;
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

  cec(name) {
    return (text) => {
      const el = this.ownerDocument.createElement(name);
      if (text) el.textContent = text;
      return el;
    };
  }

  createListItem() {
    const frag = this.ownerDocument.importNode(listItemTemplate.content, true);
    const li = frag.querySelector('li');
    const slot = li.querySelector('slot');
    const column_select = this.createColumnSelect();
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
    return li;
  }

  createColumnSelect() {
    const cec = (...args) => this.cec(...args);

    const column_select = cec('select')();
    column_select.append(...this.columns.map(cec('option')));
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

window.customElements.define('column-mapping-builder', ColumnMappingBuilder);
