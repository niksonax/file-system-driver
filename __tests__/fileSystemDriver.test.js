import FileSystemDriver from '../src/fileSystemDriver.js';
import BlockDevice from '../src/blockDevice.js';
import DirectoryEntry from '../src/directoryEntry.js';
import { TYPES } from '../src/fileDescriptor.js';

describe('FileSystemDriver', () => {
  let driver;

  beforeEach(() => {
    let device = new BlockDevice('blockDevice.txt');
    driver = new FileSystemDriver(device);
    driver.mkfs(500);
  });

  test('should be empty root directory after formatting', () => {
    let root = driver.root();
    const dirEntries = driver.ls(root);

    const expectedDirEntries = [
      new DirectoryEntry('.', 0),
      new DirectoryEntry('..', 0),
    ];
    root = driver.root();
    expect(dirEntries).toEqual(expectedDirEntries);
    expect(root.hardLinksCount).toBe(2);
  });

  test('should be able to create one file in root directory', () => {
    const fileName = 'test';

    driver.create(fileName);
    const dirEntries = driver.ls(driver.root());

    const dirDescriptor = driver.root();
    const fileDescriptorId = driver.lookup(`/${fileName}`);
    const fileDescriptor = driver.getDescriptor(fileDescriptorId);
    const expectedDirEntries = [
      new DirectoryEntry('.', 0),
      new DirectoryEntry('..', 0),
      new DirectoryEntry(fileName, 1),
    ];
    expect(dirEntries).toEqual(expectedDirEntries);
    expect(dirDescriptor.hardLinksCount).toBe(2); // . and ..
    expect(fileDescriptor.hardLinksCount).toBe(1);
  });

  test('should be able to create few files in root directory', () => {
    const fileNames = new Set(['test1', 'test2', 'test3']);

    fileNames.forEach((fileName) => {
      driver.create(fileName);
    });
    const dirEntries = driver.ls(driver.root());

    const expectedDirEntriesNames = new Set([...fileNames, '.', '..']);
    expect(dirEntries.length).toBe(fileNames.size + 2);
    expect(new Set(dirEntries.map((e) => e.name))).toEqual(
      expectedDirEntriesNames
    );
  });

  test('should be able to create many files in root directory', () => {
    const fileNames = new Set();
    for (let i = 0; i < 50; i++) {
      // 300
      fileNames.add(`test${i}`);
    }

    fileNames.forEach((fileName) => {
      driver.create(fileName);
    });
    const dirEntries = driver.ls(driver.root());

    const expectedDirEntriesNames = new Set([...fileNames, '.', '..']);
    expect(dirEntries.length).toBe(fileNames.size + 2);
    expect(new Set(dirEntries.map((e) => e.name))).toEqual(
      expectedDirEntriesNames
    );
  });

  test('should create file hard link', () => {
    const fileName1 = 'test1';
    const fileName2 = 'test2';

    driver.create(fileName1);
    driver.link(fileName1, fileName2);
    const dirEntries = driver.ls(driver.root());

    const fileDescriptor1 = driver.getDescriptor(
      driver.lookup(`/${fileName1}`)
    );
    const fileDescriptor2 = driver.getDescriptor(
      driver.lookup(`/${fileName2}`)
    );
    expect(new Set(dirEntries.map((e) => e.name))).toEqual(
      new Set([fileName1, fileName2, '.', '..'])
    );
    expect(fileDescriptor1.fileDescriptorId).toEqual(
      fileDescriptor2.fileDescriptorId
    );
    expect(fileDescriptor1.hardLinksCount).toBe(2);
  });

  test('should remove file when hard link is 0', () => {
    const fileName = 'test';

    driver.create(fileName);
    driver.unlink(fileName);
    const dirEntries = driver.ls(driver.root());

    expect(dirEntries.length).toEqual(2);
  });

  test('should reduce hard link count when unlinking', () => {
    const fileName1 = 'test1';
    const fileName2 = 'test2';
    driver.create(fileName1);
    const fileDescriptorId = driver.lookup(fileName1);

    driver.link(fileName1, fileName2);
    driver.unlink(fileName1);

    const dirEntries = driver.ls(driver.root());

    const fileDescriptor = driver.getDescriptor(fileDescriptorId);
    expect(fileDescriptor.hardLinksCount).toBe(1);
    expect(dirEntries.length).toBe(3);
  });

  test('should be able to increase file size (simple truncate)', () => {
    const fileName = 'test';
    const fileSize = 300;
    driver.create(fileName);

    driver.truncate(fileName, fileSize);

    const fileDescriptor = driver.getDescriptor(driver.lookup(fileName));
    expect(fileDescriptor.fileSize).toBe(fileSize);
  });

  test('should be able to increase file size of file that located in second tier dir', () => {
    const dirParentPath = 'test_parent';
    const dirChildPath = `${dirParentPath}/test_child`;
    driver.mkdir(dirParentPath);
    driver.mkdir(dirChildPath);

    const filePath = `${dirChildPath}/test`;
    const fileSize = 300;
    driver.create(filePath);

    driver.truncate(filePath, fileSize);

    const fileDescriptor = driver.getDescriptor(driver.lookup(filePath));
    expect(fileDescriptor.fileSize).toBe(fileSize);
  });

  test('should null all unused bytes after decreasing size', () => {
    const fileName = 'test';
    const fileSize = 30;
    const newFileSize = 20;
    driver.create(fileName);

    driver.truncate(fileName, fileSize);
    const numericFileDescriptor = driver.open(fileName);
    driver.write(numericFileDescriptor, 0, Buffer.alloc(fileSize, 1));
    driver.truncate(fileName, newFileSize);

    driver.truncate(fileName, fileSize);
    const data = driver.read(numericFileDescriptor, 0, fileSize);
    const expectedData = Buffer.alloc(fileSize);
    for (let i = 0; i < newFileSize; i++) {
      expectedData[i] = 1;
    }

    expect(data).toEqual(expectedData);
  });

  test('should set new bytes in 0 after increasing file size', () => {
    const fileName = 'test';
    const filePath = `/${fileName}`;
    const fileSize = 300;
    driver.create(filePath);
    driver.truncate(filePath, fileSize);

    const numericFileDescriptor = driver.open(filePath);
    const data = driver.read(numericFileDescriptor, 0, fileSize);

    expect(data.length).toBe(fileSize);
    expect(data).toEqual(Buffer.alloc(fileSize));
  });

  test('should be able to do simple write operation', () => {
    const fileName = 'test';
    const fileSize = 300;
    const testArr = [1, 2, 3, 4, 5];
    driver.create(fileName);
    driver.truncate(fileName, fileSize);

    const numericFileDescriptor = driver.open(fileName);
    driver.write(numericFileDescriptor, 10, Buffer.from(testArr));
    const data = driver.read(numericFileDescriptor, 0, fileSize);

    const expectedData = Buffer.alloc(fileSize);
    expectedData.set(testArr, 10);
    expect(data).toEqual(expectedData);
  });

  test('should create directory', () => {
    const dirName = 'test_dir';

    driver.mkdir(dirName);

    const dirDescriptorId = driver.lookup(dirName);
    const dirDescriptor = driver.getDescriptor(dirDescriptorId);
    const root = driver.root();
    expect(dirDescriptor.fileType).toBe(TYPES.DIRECTORY);
    expect(dirDescriptor.hardLinksCount).toBe(2); // by itself and by root
    expect(root.hardLinksCount).toBe(3);
  });

  test('should create directory inside another directory', () => {
    const dirParentPath = 'test_parent';
    const dirChildPath = `${dirParentPath}/test_child`;

    driver.mkdir(dirParentPath);
    driver.mkdir(dirChildPath);

    const dirDescriptorId = driver.lookup(dirChildPath);
    const dirDescriptor = driver.getDescriptor(dirDescriptorId);
    expect(dirDescriptor.fileType).toBe(TYPES.DIRECTORY);
    expect(dirDescriptor.hardLinksCount).toBe(2);
  });

  test('should create file that located in second tier directory', () => {
    const dirParentPath = 'test_parent';
    const dirChildPath = `${dirParentPath}/test_child`;
    driver.mkdir(dirParentPath);
    driver.mkdir(dirChildPath);
    const filePath = `${dirChildPath}/test_file`;

    driver.create(filePath);

    const fileDescriptorId = driver.lookup(filePath);
    const fileDescriptor = driver.getDescriptor(fileDescriptorId);
    expect(fileDescriptor.fileType).toBe(TYPES.REGULAR);
  });

  test('should link file that located in second tier directory', () => {
    const dirParentPath = 'test_parent';
    const dirChildPath = `${dirParentPath}/test_child`;
    driver.mkdir(dirParentPath);
    driver.mkdir(dirChildPath);
    const filePath1 = `${dirChildPath}/test_file1`;
    const filePath2 = `${dirParentPath}/test_file2`;

    driver.create(filePath1);
    driver.link(filePath1, filePath2);

    const fileDescriptorId1 = driver.lookup(filePath1);
    const fileDescriptorId2 = driver.lookup(filePath2);
    expect(fileDescriptorId1).toEqual(fileDescriptorId2);
  });

  test('should unlink file that located in second tier directory', () => {
    const dirParentPath = 'test_parent';
    const dirChildPath = `${dirParentPath}/test_child`;
    driver.mkdir(dirParentPath);
    driver.mkdir(dirChildPath);
    const filePath = `${dirChildPath}/test_file`;

    driver.create(filePath);
    driver.unlink(filePath);

    const dirDescriptorId = driver.lookup(dirChildPath);
    const dirDescriptor = driver.getDescriptor(dirDescriptorId);
    const dirEntries = driver.ls(dirDescriptor);
    expect(dirEntries).toEqual([
      new DirectoryEntry('.', 2),
      new DirectoryEntry('..', 1),
    ]);
  });

  test('should be able to delete directory', () => {
    const dirParentPath = 'test_parent';
    const dirChildPath = `${dirParentPath}/test_child`;

    driver.mkdir(dirParentPath);
    driver.mkdir(dirChildPath);
    driver.rmdir(dirChildPath);

    const dirDescriptorId = driver.lookup(dirParentPath);
    const dirDescriptor = driver.getDescriptor(dirDescriptorId);
    const dirEntries = driver.ls(dirDescriptor);
    expect(dirDescriptor.fileType).toBe(TYPES.DIRECTORY);
    expect(dirDescriptor.hardLinksCount).toBe(2);
    expect(dirEntries).toEqual([
      new DirectoryEntry('.', 1),
      new DirectoryEntry('..', 0),
    ]);
  });

  test('should be able to create symlink', () => {
    const symlinkName = 'test_symlink';
    const str = 'test_string';

    driver.symlink(str, symlinkName);

    const dirEntries = driver.ls(driver.root());
    const expectedDirEntries = [
      new DirectoryEntry('.', 0),
      new DirectoryEntry('..', 0),
      new DirectoryEntry(symlinkName, 1),
    ];
    const symlink = driver.getDescriptor(1);
    expect(dirEntries).toEqual(expectedDirEntries);
    expect(symlink.fileType).toBe(TYPES.SYMLINK);
    expect(symlink.fileSize).toEqual(str.length);
  });

  test('should correctly work with symlink in lookup (absolute path)', () => {
    const symlinkName = 'test_symlink';
    const str = '/';

    driver.symlink(str, symlinkName);
    const symlinkDescriptorId = driver.lookup(`/${symlinkName}/${symlinkName}`);

    expect(symlinkDescriptorId).toBe(1);
  });

  test('should correctly work with symlink in lookup (relative path)', () => {
    const symlinkName = 'test_symlink';
    const dirName = 'test_dir';
    const symlinkPath = `${dirName}/${symlinkName}`;
    const str = '..';

    driver.mkdir(dirName);
    driver.symlink(str, symlinkPath);
    const symlinkDescriptorId = driver.lookup(
      `/${dirName}/${symlinkName}`,
      0,
      true
    );

    expect(symlinkDescriptorId).toBe(0); // root always 0
  });
});
