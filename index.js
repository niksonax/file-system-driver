import Terminal from './src/terminal.js';
import BlockDevice from './src/blockDevice.js';
import FileSystemDriver from './src/fileSystemDriver.js';

const blockDevice = new BlockDevice('blockDevice.txt');
const driver = new FileSystemDriver(blockDevice);
const terminal = new Terminal(driver);

terminal.mkfs(100);

terminal.mkdir('test_dir_1');
terminal.cd('test_dir_1');
terminal.mkdir('test_dir_2');

console.log(terminal.cwd());

terminal.cd('test_dir_2');
console.log(terminal.cwd());
terminal.create('test_file');

console.log(terminal.cwd());
console.log(terminal.ls());

const symlinkName = 'test_symlink';
const str = '/';

terminal.symlink(str, symlinkName);
console.log(terminal.ls());
terminal.cd(symlinkName);

console.log(terminal.cwd());
console.log(terminal.ls());

// Just a basic example. All further tests are in __tests__ folder
