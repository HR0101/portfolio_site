/**
 * helpers/browserMock.js
 * Plain Node.js Mock DOM implementation without npm dependencies.
 */

class ClassList {
  constructor(element) {
    this.element = element;
  }

  get _classes() {
    const className = this.element.className.trim();
    return className ? className.split(/\s+/) : [];
  }

  set _classes(arr) {
    this.element.className = arr.join(' ');
  }

  add(...classes) {
    const current = this._classes;
    classes.forEach(c => {
      if (c && !current.includes(c)) current.push(c);
    });
    this._classes = current;
  }

  remove(...classes) {
    const current = this._classes.filter(c => !classes.includes(c));
    this._classes = current;
  }

  contains(cls) {
    return this._classes.includes(cls);
  }

  toggle(cls, force) {
    const has = this.contains(cls);
    const shouldHave = force !== undefined ? !!force : !has;
    if (shouldHave) {
      this.add(cls);
    } else {
      this.remove(cls);
    }
    return shouldHave;
  }
}

class MockElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this._id = '';
    this._className = '';
    this.childNodes = [];
    this.parentNode = null;
    this.style = {};
    this.eventListeners = {};
    this._attributes = {};
    this.classList = new ClassList(this);
    this._value = '';
    this._checked = false;
  }

  get id() {
    return this._id;
  }

  set id(val) {
    const strVal = String(val);
    this._id = strVal;
    this._attributes['id'] = strVal;
  }

  get className() {
    return this._className;
  }

  set className(val) {
    const strVal = String(val);
    this._className = strVal;
    this._attributes['class'] = strVal;
  }

  get value() {
    return this._value || '';
  }

  set value(val) {
    const strVal = String(val);
    this._value = strVal;
    this._attributes['value'] = strVal;
  }

  get checked() {
    return !!this._checked;
  }

  set checked(val) {
    this._checked = !!val;
    this._attributes['checked'] = val ? 'true' : 'false';
  }

  get textContent() {
    if (this.tagName === '#TEXT') {
      return this._textContent || '';
    }
    return this.childNodes.map(child => child.textContent).join('');
  }

  set textContent(val) {
    if (this.tagName === '#TEXT') {
      this._textContent = String(val);
    } else {
      // Clear childNodes
      while (this.childNodes.length > 0) {
        this.removeChild(this.childNodes[0]);
      }
      if (val !== undefined && val !== null) {
        const textNode = new MockElement('#text');
        textNode.textContent = val;
        this.appendChild(textNode);
      }
    }
  }

  get innerHTML() {
    if (this.tagName === '#TEXT') {
      return this.textContent;
    }
    return this.childNodes.map(child => child.outerHTML).join('');
  }

  set innerHTML(html) {
    // Clear childNodes
    while (this.childNodes.length > 0) {
      this.removeChild(this.childNodes[0]);
    }
    if (html) {
      const parsed = parseHTML(html);
      for (const child of [...parsed]) {
        this.appendChild(child);
      }
    }
  }

  get outerHTML() {
    if (this.tagName === '#TEXT') {
      return this.textContent;
    }
    const attrs = Object.keys(this._attributes)
      .map(key => ` ${key}="${this._attributes[key]}"`)
      .join('');
      
    const selfClosing = ['IMG', 'BR', 'HR', 'INPUT', 'META', 'LINK'].includes(this.tagName);
    if (selfClosing) {
      return `<${this.tagName.toLowerCase()}${attrs} />`;
    }
    
    return `<${this.tagName.toLowerCase()}${attrs}>${this.innerHTML}</${this.tagName.toLowerCase()}>`;
  }

  get attributes() {
    return Object.keys(this._attributes).map(key => ({
      name: key,
      value: this._attributes[key]
    }));
  }

  setAttribute(name, value) {
    const strVal = String(value);
    this._attributes[name] = strVal;
    if (name === 'id') {
      this._id = strVal;
    } else if (name === 'class') {
      this._className = strVal;
    } else if (name === 'value') {
      this._value = strVal;
    } else if (name === 'checked') {
      this._checked = (strVal === 'true' || strVal === 'checked' || strVal === '');
    } else if (name === 'style') {
      // Clear style object
      for (const key in this.style) {
        delete this.style[key];
      }
      // Parse inline styles
      const parts = strVal.split(';');
      for (const part of parts) {
        const colonIdx = part.indexOf(':');
        if (colonIdx !== -1) {
          const prop = part.slice(0, colonIdx).trim();
          const val = part.slice(colonIdx + 1).trim();
          if (prop && val) {
            const camelProp = prop.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            this.style[camelProp] = val;
          }
        }
      }
    }
  }

  getAttribute(name) {
    if (name === 'style') {
      const keys = Object.keys(this.style);
      if (keys.length === 0) return null;
      return keys.map(key => {
        const dashKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${dashKey}: ${this.style[key]}`;
      }).join('; ');
    }
    return this._attributes.hasOwnProperty(name) ? this._attributes[name] : null;
  }

  removeAttribute(name) {
    delete this._attributes[name];
    if (name === 'id') {
      this._id = '';
    } else if (name === 'class') {
      this._className = '';
    } else if (name === 'value') {
      this._value = '';
    } else if (name === 'checked') {
      this._checked = false;
    } else if (name === 'style') {
      this.style = {};
    }
  }

  appendChild(child) {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.childNodes.indexOf(child);
    if (idx !== -1) {
      this.childNodes.splice(idx, 1);
      child.parentNode = null;
      return child;
    }
    throw new Error("Node was not found");
  }

  insertBefore(newNode, referenceNode) {
    if (newNode.parentNode) {
      newNode.parentNode.removeChild(newNode);
    }
    newNode.parentNode = this;
    if (!referenceNode) {
      this.childNodes.push(newNode);
    } else {
      const idx = this.childNodes.indexOf(referenceNode);
      if (idx === -1) {
        throw new Error("Reference node not found");
      }
      this.childNodes.splice(idx, 0, newNode);
    }
    return newNode;
  }

  replaceChild(newChild, oldChild) {
    const idx = this.childNodes.indexOf(oldChild);
    if (idx === -1) {
      throw new Error("Old child not found");
    }
    if (newChild.parentNode) {
      newChild.parentNode.removeChild(newChild);
    }
    oldChild.parentNode = null;
    newChild.parentNode = this;
    this.childNodes[idx] = newChild;
    return oldChild;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  addEventListener(event, cb) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(cb);
  }

  removeEventListener(event, cb) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(l => l !== cb);
    }
  }

  dispatchEvent(event) {
    const eventName = typeof event === 'string' ? event : event.type;
    const ev = typeof event === 'string' ? { type: event, bubbles: true } : event;
    if (!ev.target) ev.target = this;
    if (!ev.currentTarget) ev.currentTarget = this;
    
    if (this.eventListeners[eventName]) {
      const listeners = [...this.eventListeners[eventName]];
      listeners.forEach(cb => cb.call(this, ev));
    }
    
    if (ev.bubbles !== false && this.parentNode) {
      this.parentNode.dispatchEvent(ev);
    }
  }

  click() {
    this.dispatchEvent({ type: 'click', bubbles: true });
  }

  focus() {
    // Mock focus method, do nothing or dispatch focus event if needed
  }

  querySelector(selector) {
    const list = this.querySelectorAll(selector);
    return list.length > 0 ? list[0] : null;
  }

  querySelectorAll(selector) {
    const groups = selector.split(',').map(s => s.trim()).filter(Boolean);
    const parsedGroups = groups.map(group => {
      return group.split(/\s+/).filter(Boolean).map(parseCompoundSelector);
    });
    
    const results = [];
    
    function traverse(el) {
      for (const child of el.childNodes) {
        if (child.tagName === '#TEXT') continue;
        const matchesAny = parsedGroups.some(chain => matchesSelectorChain(child, chain));
        if (matchesAny) {
          results.push(child);
        }
        traverse(child);
      }
    }
    
    traverse(this);
    return results;
  }
}

class MockDocument extends MockElement {
  constructor() {
    super('DOCUMENT');
    this.documentElement = new MockElement('HTML');
    this.body = new MockElement('BODY');
    this.documentElement.appendChild(this.body);
    this.appendChild(this.documentElement);
  }

  getElementById(id) {
    return this.querySelector('#' + id);
  }

  getElementsByClassName(cls) {
    return this.querySelectorAll('.' + cls);
  }

  getElementsByTagName(tag) {
    return this.querySelectorAll(tag);
  }

  createElement(tagName) {
    return new MockElement(tagName);
  }

  createTextNode(text) {
    const el = new MockElement('#TEXT');
    el.textContent = text;
    return el;
  }
}

// Basic CSS Selector Engine Helper Functions
function parseCompoundSelector(selector) {
  const result = {
    tag: null,
    id: null,
    classes: [],
    attrs: []
  };
  
  let remaining = selector.trim();
  if (!remaining) return null;
  
  const tagMatch = remaining.match(/^[a-zA-Z0-9-]+/);
  if (tagMatch) {
    result.tag = tagMatch[0].toUpperCase();
    remaining = remaining.slice(tagMatch[0].length);
  }
  
  while (remaining) {
    if (remaining.startsWith('.')) {
      const classMatch = remaining.match(/^\.([a-zA-Z0-9_-]+)/);
      if (classMatch) {
        result.classes.push(classMatch[1]);
        remaining = remaining.slice(classMatch[0].length);
      } else {
        break;
      }
    } else if (remaining.startsWith('#')) {
      const idMatch = remaining.match(/^#([a-zA-Z0-9_-]+)/);
      if (idMatch) {
        result.id = idMatch[1];
        remaining = remaining.slice(idMatch[0].length);
      } else {
        break;
      }
    } else if (remaining.startsWith('[')) {
      const attrMatch = remaining.match(/^\[([a-zA-Z0-9_-]+)(?:([~|^$*]?=)([\'"]?)([^\'\"\]]*)\3)?\]/);
      if (attrMatch) {
        result.attrs.push({
          name: attrMatch[1],
          operator: attrMatch[2] || '=',
          value: attrMatch[4] !== undefined ? attrMatch[4] : null
        });
        remaining = remaining.slice(attrMatch[0].length);
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return result;
}

function matchesParsedSelector(element, parsed) {
  if (!parsed) return false;
  if (parsed.tag && element.tagName !== parsed.tag) return false;
  if (parsed.id && element.id !== parsed.id) return false;
  for (const cls of parsed.classes) {
    if (!element.classList.contains(cls)) return false;
  }
  for (const attr of parsed.attrs) {
    const actualVal = element.getAttribute(attr.name);
    if (actualVal === null) return false;
    if (attr.value !== null) {
      if (attr.operator === '=') {
        if (actualVal !== attr.value) return false;
      } else if (attr.operator === '^=') {
        if (!actualVal.startsWith(attr.value)) return false;
      } else if (attr.operator === '$=') {
        if (!actualVal.endsWith(attr.value)) return false;
      } else if (attr.operator === '*=') {
        if (!actualVal.includes(attr.value)) return false;
      } else {
        if (actualVal !== attr.value) return false;
      }
    }
  }
  return true;
}

function matchesSelectorChain(element, compoundSelectors) {
  if (compoundSelectors.length === 0) return false;
  
  const lastIndex = compoundSelectors.length - 1;
  if (!matchesParsedSelector(element, compoundSelectors[lastIndex])) {
    return false;
  }
  
  let currentElement = element.parentNode;
  for (let i = lastIndex - 1; i >= 0; i--) {
    const selector = compoundSelectors[i];
    let matched = false;
    while (currentElement) {
      if (currentElement.tagName !== '#TEXT' && matchesParsedSelector(currentElement, selector)) {
        matched = true;
        currentElement = currentElement.parentNode;
        break;
      }
      currentElement = currentElement.parentNode;
    }
    if (!matched) return false;
  }
  return true;
}

// Basic HTML tokenizer/parser
function parseHTML(htmlString) {
  const tokens = [];
  const regex = /(<!--[\s\S]*?-->)|(<[^>]+>)|([^<]+)/g;
  let match;
  while ((match = regex.exec(htmlString)) !== null) {
    if (match[1]) {
      // comment - ignore
    } else if (match[2]) {
      // tag
      tokens.push({ type: 'tag', content: match[2] });
    } else if (match[3]) {
      // text - trim it if it's pure whitespace, but keep it if it contains actual content
      const content = match[3];
      if (content.trim()) {
        tokens.push({ type: 'text', content });
      }
    }
  }
  
  const root = new MockElement('TEMP_ROOT');
  const stack = [root];
  
  for (const token of tokens) {
    if (token.type === 'tag') {
      const tagStr = token.content;
      if (tagStr.startsWith('</')) {
        if (stack.length > 1) {
          stack.pop();
        }
      } else {
        const tagMatch = tagStr.match(/<([a-zA-Z0-9:-]+)/);
        if (!tagMatch) continue;
        const tagName = tagMatch[1];

        const isSelfClosing = tagStr.endsWith('/>') || 
                              /\b(img|br|hr|input|meta|link)\b/i.test(tagName);
        
        const el = new MockElement(tagName);
        
        // Parse attributes
        // Match name="value", name='value', name=value, or just name
        const attrRegex = /([a-zA-Z0-9_-]+)(?:=([\'"]?)([^\'\"]*)\2)?/g;
        attrRegex.lastIndex = tagMatch[0].length;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(tagStr.slice(0, tagStr.length - (isSelfClosing ? 2 : 1)))) !== null) {
          const name = attrMatch[1];
          const value = attrMatch[3] !== undefined ? attrMatch[3] : '';
          el.setAttribute(name, value);
        }
        
        const parent = stack[stack.length - 1];
        parent.appendChild(el);
        
        if (!isSelfClosing) {
          stack.push(el);
        }
      }
    } else if (token.type === 'text') {
      const parent = stack[stack.length - 1];
      const textNode = new MockElement('#TEXT');
      textNode.textContent = token.content;
      parent.appendChild(textNode);
    }
  }
  
  return [...root.childNodes];
}

// Environment Setup
function setupBrowserEnvironment(htmlContent) {
  const doc = new MockDocument();
  if (htmlContent) {
    const parsed = parseHTML(htmlContent);
    for (const child of [...parsed]) {
      doc.body.appendChild(child);
    }
  }
  
  const lsStore = {};
  const localStorageMock = {
    getItem(key) {
      return lsStore.hasOwnProperty(key) ? lsStore[key] : null;
    },
    setItem(key, value) {
      lsStore[key] = String(value);
    },
    removeItem(key) {
      delete lsStore[key];
    },
    clear() {
      for (const key in lsStore) {
        delete lsStore[key];
      }
    }
  };
  
  const fetchMock = function(url, options = {}) {
    if (url === 'https://api.github.com/users/HR0101/repos') {
      if (fetchMock.rateLimitExceeded) {
        return Promise.resolve({
          status: 403,
          statusText: 'Forbidden',
          headers: {
            get(name) {
              if (name.toLowerCase() === 'x-ratelimit-remaining') return '0';
              return null;
            }
          },
          json: () => Promise.resolve({ message: "API rate limit exceeded" }),
          text: () => Promise.resolve("API rate limit exceeded")
        });
      }
      if (fetchMock.isOffline) {
        return Promise.reject(new Error("TypeError: Failed to fetch"));
      }
      
      const mockRepos = fetchMock.mockData || [
        {
          name: "SwiftUI-Dashboard",
          description: "iOS Dashboard in SwiftUI",
          stargazers_count: 120,
          language: "Swift",
          updated_at: "2026-06-01T12:00:00Z"
        },
        {
          name: "Swift-Audio-Engine",
          description: "CoreAudio wrapper in Swift",
          stargazers_count: 85,
          language: "Swift",
          updated_at: "2026-05-15T12:00:00Z"
        },
        {
          name: "Swift-URLSession-Client",
          description: "Networking client for Swift",
          stargazers_count: 45,
          language: "Swift",
          updated_at: "2026-04-20T12:00:00Z"
        },
        {
          name: "Swift-Crypto-Kit",
          description: "CommonCrypto helper",
          stargazers_count: 30,
          language: "Swift",
          updated_at: "2025-12-10T12:00:00Z"
        },
        {
          name: "Swift-Combine-State",
          description: "State management via Combine",
          stargazers_count: 60,
          language: "Swift",
          updated_at: "2026-02-18T12:00:00Z"
        },
        {
          name: "js-router-simple",
          description: "Frontend router in JS",
          stargazers_count: 55,
          language: "JavaScript",
          updated_at: "2026-06-03T12:00:00Z"
        },
        {
          name: "js-canvas-game",
          description: "HTML5 Canvas game",
          stargazers_count: 90,
          language: "JavaScript",
          updated_at: "2026-01-05T12:00:00Z"
        },
        {
          name: "js-markdown-parser",
          description: "Simple markdown renderer",
          stargazers_count: 40,
          language: "JavaScript",
          updated_at: "2026-05-30T12:00:00Z"
        },
        {
          name: "ts-graphql-server",
          description: "GraphQL template",
          stargazers_count: 110,
          language: "TypeScript",
          updated_at: "2026-04-12T12:00:00Z"
        },
        {
          name: "ts-validator-lib",
          description: "Schema validator for TS",
          stargazers_count: 75,
          language: "TypeScript",
          updated_at: "2026-05-25T12:00:00Z"
        },
        {
          name: "py-cli-weather",
          description: "Command line weather app",
          stargazers_count: 25,
          language: "Python",
          updated_at: "2026-03-01T12:00:00Z"
        },
        {
          name: "py-django-blog",
          description: "Blog platform in Django",
          stargazers_count: 50,
          language: "Python",
          updated_at: "2025-08-14T12:00:00Z"
        },
        {
          name: "py-scikit-learn-model",
          description: "Classification model pipeline",
          stargazers_count: 95,
          language: "Python",
          updated_at: "2026-02-28T12:00:00Z"
        },
        {
          name: "go-http-mux",
          description: "High performance router",
          stargazers_count: 80,
          language: "Go",
          updated_at: "2026-06-05T12:00:00Z"
        },
        {
          name: "go-gRPC-service",
          description: "Microservice template",
          stargazers_count: 65,
          language: "Go",
          updated_at: "2026-03-15T12:00:00Z"
        },
        {
          name: "rust-json-parser",
          description: "Fast JSON parsing library",
          stargazers_count: 150,
          language: "Rust",
          updated_at: "2026-05-28T12:00:00Z"
        },
        {
          name: "rust-key-value-store",
          description: "In-memory database",
          stargazers_count: 105,
          language: "Rust",
          updated_at: "2026-04-01T12:00:00Z"
        },
        {
          name: "kotlin-notes-app",
          description: "Android notes application",
          stargazers_count: 35,
          language: "Kotlin",
          updated_at: "2026-01-20T12:00:00Z"
        },
        {
          name: "html-css-resume",
          description: "Printable online CV template",
          stargazers_count: 20,
          language: "HTML/CSS",
          updated_at: "2025-05-10T12:00:00Z"
        }
      ];
      
      return Promise.resolve({
        status: 200,
        statusText: 'OK',
        headers: {
          get(name) {
            if (name.toLowerCase() === 'x-ratelimit-remaining') return '60';
            return null;
          }
        },
        json: () => Promise.resolve(mockRepos),
        text: () => Promise.resolve(JSON.stringify(mockRepos))
      });
    }
    return Promise.reject(new Error(`Not Found: ${url}`));
  };
  
  fetchMock.rateLimitExceeded = false;
  fetchMock.isOffline = false;
  fetchMock.mockData = null;
  
  const win = {
    document: doc,
    localStorage: localStorageMock,
    navigator: { userAgent: "NodeMockBrowser" },
    fetch: fetchMock,
    addEventListener(event, cb) {
      doc.addEventListener(event, cb);
    },
    removeEventListener(event, cb) {
      doc.removeEventListener(event, cb);
    },
    dispatchEvent(event) {
      doc.dispatchEvent(event);
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  };
  
  global.window = win;
  global.document = doc;
  global.localStorage = localStorageMock;
  global.navigator = win.navigator;
  global.fetch = fetchMock;
  
  return { window: win, document: doc, localStorage: localStorageMock, fetch: fetchMock };
}

module.exports = {
  MockElement,
  MockDocument,
  parseHTML,
  setupBrowserEnvironment
};
