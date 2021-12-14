class Terminal {
  constructor(fsDriver) {
    this.fsDriver = fsDriver;
    this.cwdDescriptorId = 0;
  }

  mkfs(n) {
    this.fsDriver.mkfs(n);
  }

  ls(directoryPath = '.') {
    const absolutePath = this._getAbsolutePath(directoryPath);
    const dirDescriptorId = this.fsDriver.lookup(absolutePath);
    const dirDescriptor = this.fsDriver.getDescriptor(dirDescriptorId);

    return this.fsDriver.ls(dirDescriptor);
  }

  create(filePath) {
    const absolutePath = this._getAbsolutePath(filePath);

    return this.fsDriver.create(absolutePath);
  }

  mkdir(path) {
    const absolutePath = this._getAbsolutePath(path);

    return this.fsDriver.mkdir(absolutePath);
  }

  rmdir(path) {
    const absolutePath = this._getAbsolutePath(path);

    return this.fsDriver.rmdir(absolutePath);
  }

  open(filePath) {
    const absolutePath = this._getAbsolutePath(filePath);

    return this.fsDriver.open(absolutePath);
  }

  close(numericFileDescriptor) {
    return this.fsDriver.close(numericFileDescriptor);
  }

  read(numericFileDescriptor, offset, size) {
    return this.fsDriver.read(numericFileDescriptor, offset, size);
  }

  write(numericFileDescriptor, offset, data) {
    return this.fsDriver.write(numericFileDescriptor, offset, data);
  }

  link(filePath1, filePath2) {
    const absolutePath1 = this._getAbsolutePath(filePath1);
    const absolutePath2 = this._getAbsolutePath(filePath2);

    return this.fsDriver.link(absolutePath1, absolutePath2);
  }

  unlink(filePath) {
    const absolutePath = this._getAbsolutePath(filePath);

    return this.fsDriver.unlink(absolutePath);
  }

  truncate(filePath, fileSize) {
    const absolutePath = this._getAbsolutePath(filePath);

    return this.fsDriver.truncate(absolutePath, fileSize);
  }

  fstat(fileDescriptorId) {
    return this.fsDriver.getDescriptor(fileDescriptorId);
  }

  root() {
    return this.fsDriver.root();
  }

  symlink(str, path) {
    const absolutePath = this._getAbsolutePath(path);

    return this.fsDriver.symlink(str, absolutePath);
  }

  cd(path) {
    /* const newDirPath = this._getAbsolutePath(path);
    console.log('newDirPath', newDirPath); */
    this.cwdDescriptorId = this.fsDriver.lookup(
      path,
      this.cwdDescriptorId,
      true
    );
  }

  cwd() {
    if (this.cwdDescriptorId == 0) {
      return '/';
    }

    let res = '';
    let path = '..';

    let descriptorId = this.cwdDescriptorId;

    let parentDirEntries = null;
    let parentDirEntry = null;

    do {
      const parentDescriptorId = this.fsDriver.lookup(path, descriptorId);
      const parentDescriptor = this.fsDriver.getDescriptor(parentDescriptorId);

      parentDirEntries = this.fsDriver.ls(parentDescriptor);

      const dirEntry = parentDirEntries.find(
        (dirEntry) => dirEntry.fileDescriptorId === descriptorId
      );
      const dirName = dirEntry.name;

      res = `/${dirName}${res}`;
      path = `../${path}`;

      parentDirEntry = parentDirEntries.find(
        (dirEntry) => dirEntry.name === '..'
      );

      descriptorId = parentDescriptorId;
    } while (parentDirEntry.fileDescriptorId !== descriptorId);

    return res;
  }

  _getAbsolutePath(path) {
    if (path.length > 0 && path[0] === '/') return path;

    const dirPath = this.cwd();
    const newDirPath = dirPath === '/' ? `/${path}` : `${dirPath}/${path}`;

    return newDirPath;
  }
}

export default Terminal;
