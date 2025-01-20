import { exec } from 'child_process';

console.log("Executing updated transfer-video.js script...");

exec('node transfer-video.js', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
});