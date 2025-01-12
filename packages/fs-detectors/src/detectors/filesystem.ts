export interface Stat {
  name: string;
  path: string;
  type: 'file' | 'dir';
}
/**
 * `DetectorFilesystem` is an abstract class that represents a virtual filesystem
 * to perform read-only operations on in order to detect which framework is being
 * used.
 *
 * Its abstract methods must be implemented by a subclass that perform the actual
 * FS operations. Example subclasses could be implemented as:
 *
 *  - Local filesystem, which proxies the FS operations to the equivalent `fs`
 *    module functions.
 *  - HTTP filesystem, which implements the FS operations over an HTTP server
 *    and does not require a local copy of the files.
 *  - `Files` filesystem, which operates on a virtual `Files` object (i.e. from
 *    the `glob()` function) which could include `FileFsRef`, `FileBlob`, etc.
 *
 * This base class implements various helper functions for common tasks (i.e.
 * read and parse a JSON file). It also includes caching for all FS operations
 * so that multiple detector functions de-dup read operations on the same file
 * to reduce network/filesystem overhead.
 *
 * **NOTE:** It's important that all instance methods in this base class are
 * bound to `this` so that the `fs` object may be destructured in the detector
 * functions. The easiest way to do this is to use the `=` syntax when defining
 * methods in this class definition.
 */
export abstract class DetectorFilesystem {
  protected abstract _hasPath(name: string): Promise<boolean>;
  protected abstract _readFile(name: string): Promise<Buffer>;
  protected abstract _isFile(name: string): Promise<boolean>;
  protected abstract _readdir(name: string): Promise<Stat[]>;
  protected abstract _chdir(name: string): DetectorFilesystem;

  private pathCache: Map<string, Promise<boolean>>;
  private fileCache: Map<string, Promise<boolean>>;
  private readFileCache: Map<string, Promise<Buffer>>;
  private readdirCache: Map<string, Promise<Stat[]>>;

  constructor() {
    this.pathCache = new Map();
    this.fileCache = new Map();
    this.readFileCache = new Map();
    this.readdirCache = new Map();
  }

  public hasPath = async (path: string): Promise<boolean> => {
    let p = this.pathCache.get(path);
    if (!p) {
      p = this._hasPath(path);
      this.pathCache.set(path, p);
    }
    return p;
  };

  public isFile = async (name: string): Promise<boolean> => {
    let p = this.fileCache.get(name);
    if (!p) {
      p = this._isFile(name);
      this.fileCache.set(name, p);
    }
    return p;
  };

  public readFile = async (name: string): Promise<Buffer> => {
    let p = this.readFileCache.get(name);
    if (!p) {
      p = this._readFile(name);
      this.readFileCache.set(name, p);
    }
    return p;
  };

  /**
   * Returns a list of Stat objects from the current working directory.
   */
  public readdir = async (name: string): Promise<Stat[]> => {
    let p = this.readdirCache.get(name);
    if (!p) {
      p = this._readdir(name);
      this.readdirCache.set(name, p);
    }
    return p;
  };

  /**
   * Changes the current directory to the specified path and returns a new instance of DetectorFilesystem.
   */
  public chdir = (name: string): DetectorFilesystem => {
    return this._chdir(name);
  };

  /**
   * Writes a file to the filesystem cache.
   * @param name the name of the file to write
   * @param content The content of the file
   */
  public writeFile(name: string, content?: string): void {
    if (content)
      this.readFileCache.set(name, Promise.resolve(Buffer.from(content)));
    this.fileCache.set(name, Promise.resolve(true));
    this.pathCache.set(name, Promise.resolve(true));
  }
}
