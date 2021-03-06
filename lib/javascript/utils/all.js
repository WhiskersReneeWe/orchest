import React from "react";

export function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    let r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function nameToFilename(name) {
  return name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

export var LANGUAGE_MAP = {
  python: "Python 3",
  r: "R",
};

export var DEFAULT_BASE_IMAGES = [
  "orchest/custom-base-kernel-py",
  "orchest/custom-base-kernel-py-gpu",
  "orchest/custom-base-kernel-r",
];

export var ALLOWED_STEP_EXTENSIONS = ["ipynb", "py", "R", "sh"];

export function absoluteToRelativePath(path, cwd) {
  // to simplify algorithm, path always end with a '/' (also for files)
  let isFile = !path.endsWith("/");
  if (isFile) {
    path = path + "/";
  }

  let relativePath = path;

  if (cwd !== undefined) {
    // path in cwd or outside
    if (path.startsWith(cwd)) {
      relativePath = path.slice(cwd.length - 1);
    } else {
      // get components /abc/def/ -> [abc, def]
      let cwdC = cwd.split("/").slice(1, -1);
      let pathC = path.split("/").slice(1, -1);

      let relativePrefixCount = 0;
      let overlappingComponents = 0;
      for (let x = 0; x < cwdC.length; x++) {
        if (cwdC[x] != pathC[x]) {
          relativePrefixCount = cwdC.length - x;
          break;
        } else {
          overlappingComponents++;
        }
      }

      relativePath =
        "/" +
        "../".repeat(relativePrefixCount) +
        pathC
          .slice(overlappingComponents)
          .map((el) => {
            return el + "/";
          })
          .join("");
    }
  }

  // remove appended slash
  if (isFile) {
    relativePath = relativePath.slice(0, -1);
  }

  return relativePath;
}

export function makeCancelable(promise, promiseManager) {
  let hasCanceled_ = false;

  let cancelablePromise = {
    cancel() {
      hasCanceled_ = true;
    },
  };

  const wrappedPromise = new Promise((resolve, reject) => {
    promise.then(
      (val) => {
        hasCanceled_ ? reject({ isCanceled: true }) : resolve(val);

        promiseManager.clearCancelablePromise(cancelablePromise);
      },
      (error) => {
        hasCanceled_ ? reject({ isCanceled: true }) : reject(error);

        promiseManager.clearCancelablePromise(cancelablePromise);
      }
    );
  });

  cancelablePromise.promise = wrappedPromise;

  promiseManager.appendCancelablePromise(cancelablePromise);

  return cancelablePromise;
}

export class RefManager {
  constructor() {
    this._refs = {};

    this.refs = new Proxy(this._refs, {
      get: (target, name, receiver) => {
        if (!target[name]) {
          return;
        }
        return target[name].current;
      },
      set: (target, name, value, receiver) => {
        target[name] = value;
      },
    });

    this.nrefs = new Proxy(this._refs, {
      get: (target, name, receiver) => {
        if (!target[name]) {
          target[name] = new React.createRef();
        }

        return target[name];
      },
    });
  }
}

export class PromiseManager {
  constructor() {
    this.cancelablePromises = [];
  }

  appendCancelablePromise(cancelablePromise) {
    this.cancelablePromises.push(cancelablePromise);
  }

  cancelCancelablePromises() {
    for (let cancelablePromise of this.cancelablePromises) {
      cancelablePromise.cancel();
    }
  }

  clearCancelablePromise(cancelablePromise) {
    let index = this.cancelablePromises.indexOf(cancelablePromise);
    this.cancelablePromises.splice(index, 1);
  }
}

export function someParentHasClass(element, classname) {
  if (element.classList && element.classList.contains(classname)) return true;
  return (
    element.parentNode && someParentHasClass(element.parentNode, classname)
  );
}

export function checkHeartbeat(url, retries) {
  if (retries === undefined) {
    retries = 250;
  }

  let tries = 0;

  let requestLambda = (resolve, reject) => {
    makeRequest("GET", url, {}, undefined, 1000)
      .then(() => {
        resolve();
      })
      .catch(() => {
        tries++;
        if (tries < retries) {
          setTimeout(() => {
            requestLambda(resolve, reject);
          }, 1000);
        } else {
          reject(retries);
        }
      });
  };

  return new Promise((resolve, reject) => {
    requestLambda(resolve, reject);
  });
}

export function extensionFromFilename(filename) {
  if (filename.indexOf(".") === -1) {
    return "";
  }
  let pieces = filename.split(".");
  return pieces[pieces.length - 1];
}

export function filenameWithoutExtension(filename) {
  let pieces = filename.split(".");
  return pieces.slice(0, pieces.length - 1).join(".");
}

export function intersectRect(r1, r2) {
  return !(
    r2.x > r1.x + r1.width ||
    r2.x + r2.width < r1.x ||
    r2.y > r1.y + r1.height ||
    r2.y + r2.height < r1.y
  );
}

export function validURL(str) {
  var pattern = new RegExp(
    "^(https?:\\/\\/)?" + // protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-z\\d_]*)?$",
    "i"
  ); // fragment locator
  return !!pattern.test(str);
}

export function kernelNameToLanguage(kernel_name) {
  let mapping = {
    ir: "r",
  };
  return mapping[kernel_name] ? mapping[kernel_name] : kernel_name;
}

export function arraysEqual(a, b) {
  return JSON.stringify(a) == JSON.stringify(b);
}

export function makeRequest(method, url, body, onprogressCallback, timeout) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url);

    if (onprogressCallback) {
      xhr.onreadystatechange = onprogressCallback;
    }

    if (timeout === undefined) {
      timeout = 120 * 1000;
    }

    xhr.timeout = timeout; // 120 second timeout

    xhr.setRequestHeader(
      "Cache-Control",
      "no-cache, must-revalidate, post-check=0, pre-check=0"
    );

    if (body !== undefined && body.type === "json") {
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    }

    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve(xhr.response);
      } else {
        reject({
          status: this.status,
          statusText: xhr.statusText,
          body: xhr.response,
        });
      }
    };
    xhr.onerror = function () {
      reject({
        status: this.status,
        statusText: xhr.statusText,
        body: xhr.response,
      });
    };

    xhr.ontimeout = function () {
      console.log("Request timed out.");
      reject({
        status: this.status,
        statusText: xhr.statusText,
        body: xhr.response,
      });
    };

    if (body !== undefined) {
      if (body.type === "json") {
        xhr.send(JSON.stringify(body.content));
      } else {
        xhr.send(body.content);
      }
    } else {
      xhr.send();
    }
  });
}

export class PersistentLocalConfig {
  constructor(localStoragePrefix) {
    this.localStoragePrefix = localStoragePrefix;
  }

  set(key, value) {
    return window.localStorage.setItem(
      `${this.localStoragePrefix}.${key}`,
      value
    );
  }

  get(key) {
    let value = window.localStorage.getItem(
      `${this.localStoragePrefix}.${key}`
    );
    if (value === null) {
      value = undefined;
    }
    return value;
  }
  remove(key) {
    window.localStorage.removeItem(`${this.localStoragePrefix}.${key}`);
  }
}

export function nodeCenter(el) {
  let position = {};

  position.x = el.offset().left + el.width() / 2;
  position.y = el.offset().top + el.height() / 2;

  return position;
}

export function correctedPosition(x, y, el) {
  let elementOffset = el.offset();
  let position = {};
  position.x = x - elementOffset.left;
  position.y = y - elementOffset.top;
  return position;
}

export function globalMDCVars() {
  return {
    mdcthemeprimary: "#000000",
    mdcthemesecondary: "#0a6df7",
    mdcthemebackground: "#fff",
  };
}
