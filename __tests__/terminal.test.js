import FileSystemDriver from '../src/fileSystemDriver.js';
import BlockDevice from '../src/blockDevice.js';
import Terminal from '../src/terminal.js';

describe('Terminal', () => {
  let terminal;

  beforeEach(() => {
    let device = new BlockDevice('blockDeviceTerminal.txt');
    let driver = new FileSystemDriver(device);
    terminal = new Terminal(driver);
    terminal.mkfs(500);
  });

  test('should change current work directory with cd()', () => {
    const dirName = 'test_dir';

    terminal.mkdir(dirName);
    terminal.cd(dirName);

    const cwd = terminal.cwd();
    const expectedCwd = `/${dirName}`;
    expect(cwd).toEqual(expectedCwd);
  });

  test('should go back to root directory', () => {
    const dirName = 'test_dir';

    terminal.mkdir(dirName);
    terminal.cd(dirName);
    terminal.cd('..');

    const cwd = terminal.cwd();
    const expectedCwd = '/'; // back to root
    expect(cwd).toEqual(expectedCwd);
  });

  test('should show correct cwd when in multiple tier depth directory', () => {
    terminal.mkdir('test_dir_1');
    terminal.cd('test_dir_1');
    terminal.mkdir('test_dir_2');

    terminal.cd('test_dir_2');

    const expectedCwd = '/test_dir_1/test_dir_2';
    expect(terminal.cwd()).toEqual(expectedCwd);
  });
});
