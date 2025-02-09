#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const ora = require("ora-classic");
const chalk = require("chalk"); // Added for color styling

// Function to read the content of a file
const readFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

// Function to count lines and words in a file
const countLinesAndWords = (data) => {
  const lines = data.split("\n").length;
  const words = data.split(/\s+/).filter(Boolean).length;
  return { lines, words };
};

// Function to traverse a directory and process files
const traverseDirectory = async (
  dir,
  excludeFolders,
  excludeExtensions,
  spinner,
  totalFiles
) => {
  let totalLines = 0;
  let totalWords = 0;
  let currentFileCount = 0;

  const files = await fs.promises.readdir(dir, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dir, file.name);

    if (file.isDirectory()) {
      if (!excludeFolders.includes(file.name)) {
        const { lines, words, filesCount } = await traverseDirectory(
          filePath,
          excludeFolders,
          excludeExtensions,
          spinner,
          totalFiles
        );
        totalLines += lines;
        totalWords += words;
        currentFileCount += filesCount;
      }
    } else {
      const fileExtension = path.extname(file.name);
      if (!excludeExtensions.includes(fileExtension)) {
        const data = await readFile(filePath);
        const { lines, words } = countLinesAndWords(data);
        totalLines += lines;
        totalWords += words;
        currentFileCount += 1;

        // Update spinner text only when totalFiles is available
        if (totalFiles) {
          spinner.text = `Processing files... (${currentFileCount}/${totalFiles})`;
        }
      }
    }
  }

  return { lines: totalLines, words: totalWords, filesCount: currentFileCount };
};

// Function to count total files for progress indication
const countFiles = async (dir, excludeFolders, excludeExtensions) => {
  let count = 0;
  const files = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      if (!excludeFolders.includes(file.name)) {
        count += await countFiles(filePath, excludeFolders, excludeExtensions);
      }
    } else {
      if (!excludeExtensions.includes(path.extname(file.name))) {
        count += 1;
      }
    }
  }
  return count;
};

// Main function
const main = async () => {
  const repoPath = process.cwd(); // Use the current working directory
  const excludeFolders = ["node_modules", ".git"]; // Specify folders to exclude here
  const excludeExtensions = []; // Specify file extensions to exclude here

  try {
    // Initialize spinner
    const spinner = ora("Counting files...").start();

    // Count total files for progress indication
    const totalFiles = await countFiles(
      repoPath,
      excludeFolders,
      excludeExtensions
    );
    spinner.text = `Found ${totalFiles} files to process`;

    // Process files
    const { lines, words, filesCount } = await traverseDirectory(
      repoPath,
      excludeFolders,
      excludeExtensions,
      spinner
    );

    // Stop spinner
    spinner.succeed(chalk.green("Processing complete."));

    // Display results with styling
    console.log(chalk.cyan.bold("Total lines:"), lines);
    console.log(chalk.cyan.bold("Total words:"), words);
    console.log(chalk.cyan.bold("Total files:"), filesCount);
  } catch (err) {
    console.error(chalk.red("Error:"), err);
  }
};

main();
