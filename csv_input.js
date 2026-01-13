const str = `
    /* my own styles */
    textarea {
      min-height: 10rem;
      /* might want to add this to simple.css for :not([cols]) */
      resize: vertical;
    }
    textarea::placeholder {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
`;

export class CsvInput extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    // accept pasted, dropped, or file-selected text or files.
    let form = this.querySelector('form');
    if (!form) {
      this.append(this.getForm());
      form = this.querySelector('form');
    }

    const processItem = async (item, form) => {
      if (!item) return;
      if (item.kind === 'file') item = item.getAsFile();
      if (item.kind === 'string') {
        item = await new Promise((res) => item.getAsString(res));
      }
      if (item instanceof Blob) item = await item.text();
      if (typeof item === 'string') {
        form.content.value = item;
        form.requestSubmit();
      } else {
        console.error({message: 'item not DataTransferItem, Blob/File, or string', item});
      }
    };
    // TODO: support google sheets

    const findBestItem = (dataTransfer) => {
      // "CSV"-like mime types:
      // text/csv
      // application/csv
      // text/comma-separated-values
      // text/tab-separated-values

      let index = -1;
      let best = { index, isFile: false, isText: false, isCsv: false };
      for (const i of dataTransfer.items) {
        index++;
        const isFile = i.kind === 'file';
        if (!isFile && i.kind !== 'string') continue;
        const current = {
          index,
          isFile,
          isText: i.type.startsWith('text'),
          isCsv: !!i.type.match(
            '^(text|application)/(csv|(comma|tab)-separated-values)'
          ),
        };
        // if there are any files, ignore non-files
        if (best.isFile != current.isFile) {
          if (current.isFile) best = current;
          continue;
        }
        if (best.isCsv != current.isCsv) {
          if (current.isCsv) best = current;
          continue;
        }
        if (!best.isText && current.isText) best = current;
      }
      if (best.index != -1 && (best.isText || best.isCsv)) {
        return dataTransfer.items[best.index];
      }
      return null;
    };

    form.addEventListener('dragover', e => {
      const bestItem = findBestItem(e.dataTransfer);
      if (!bestItem) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    });

    form.addEventListener('drop', e => {
      e.preventDefault();
      const bestItem = findBestItem(e.dataTransfer);
      if (!bestItem) return;
      processItem(bestItem, e.currentTarget.closest('form'));
    });

    form.addEventListener('paste', e => {
      const bestItem = findBestItem(e.clipboardData);
      if (bestItem?.kind !== 'file') return;
      e.preventDefault();
      processItem(bestItem, e.currentTarget.closest('form'));
    });

    const fileInput = form.querySelector('input[type=file]');
    fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      e.target.value = null;
      processItem(file, e.currentTarget.closest('form'));
    });
  }

  getForm() {
    return this.ownerDocument.importNode(template.content, true);
  }
}

const template = window.document.createElement('template');
template.innerHTML = `
  <form action="javascript:void(0);">
    <textarea name="content" placeholder="Paste or drop CSV data or file"></textarea>
    <input type="submit"value="Use Text" />
    <label class="button">Use Local File<input type="file" style="display: none" accept="text/*" /></label>
  </form>
`;

window.customElements.define('csv-input', CsvInput);
