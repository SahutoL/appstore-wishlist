import { stripTypeScriptTypes } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = new URL('..', import.meta.url);
const srcDir = path.join(rootDir.pathname, 'src');
const distDir = path.join(rootDir.pathname, 'dist');
const contentEntryPath = path.join(distDir, 'content', 'index.js');

async function removeDist() {
  await fs.rm(distDir, { force: true, recursive: true });
}

async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function buildDirectory(currentPath) {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(currentPath, entry.name);
    const relativePath = path.relative(srcDir, sourcePath);
    const isDeclarationFile = entry.isFile() && entry.name.endsWith('.d.ts');
    const targetPath = path.join(
      distDir,
      entry.isFile() && entry.name.endsWith('.ts') && !isDeclarationFile
        ? relativePath.replace(/\.ts$/u, '.js')
        : relativePath
    );

    if (entry.isDirectory()) {
      await ensureDirectory(targetPath);
      await buildDirectory(sourcePath);
      continue;
    }

    if (isDeclarationFile) {
      continue;
    }

    await ensureDirectory(path.dirname(targetPath));

    if (entry.name.endsWith('.ts')) {
      const sourceCode = await fs.readFile(sourcePath, 'utf8');
      const transformedCode = stripTypeScriptTypes(sourceCode, {
        mode: 'transform',
        sourceMap: false,
        sourceUrl: relativePath
      });

      await fs.writeFile(targetPath, transformedCode, 'utf8');
      continue;
    }

    await fs.copyFile(sourcePath, targetPath);
  }
}

function toModuleId(filePath) {
  return path.relative(distDir, filePath).replaceAll(path.sep, '/');
}

function parseImportClauses(clause, dependencyId) {
  const trimmed = clause.trim();

  if (!trimmed) {
    return `__require(${JSON.stringify(dependencyId)});`;
  }

  if (trimmed.startsWith('{')) {
    return `const ${trimmed} = __require(${JSON.stringify(dependencyId)});`;
  }

  if (trimmed.startsWith('* as ')) {
    return `const ${trimmed.slice(5)} = __require(${JSON.stringify(dependencyId)});`;
  }

  if (trimmed.includes(',')) {
    const [defaultImport, namedImport] = trimmed.split(',', 2);
    return [
      `const { default: ${defaultImport.trim()} } = __require(${JSON.stringify(
        dependencyId
      )});`,
      namedImport.trim()
        ? `const ${namedImport.trim()} = __require(${JSON.stringify(dependencyId)});`
        : ''
    ]
      .filter(Boolean)
      .join('\n');
  }

  return `const { default: ${trimmed} } = __require(${JSON.stringify(dependencyId)});`;
}

function transformModuleCode(code, filePath, collectDependency) {
  const exportedNames = new Map();
  let transformed = code.replace(/\n?\/\/# sourceURL=.*$/gu, '');

  transformed = transformed.replace(
    /(^|\n)\s*import\s+([\s\S]*?)\s+from\s+['"](.+?)['"];?/gu,
    (match, prefix, clause, specifier) => {
      const dependencyPath = path.resolve(path.dirname(filePath), specifier);
      const dependencyId = collectDependency(dependencyPath);
      return `${prefix}${parseImportClauses(clause, dependencyId)}`;
    }
  );

  transformed = transformed.replace(
    /(^|\n)\s*import\s+['"](.+?)['"];?/gu,
    (match, prefix, specifier) => {
      const dependencyPath = path.resolve(path.dirname(filePath), specifier);
      const dependencyId = collectDependency(dependencyPath);
      return `${prefix}__require(${JSON.stringify(dependencyId)});`;
    }
  );

  transformed = transformed.replace(
    /export\s+(async\s+function|function|class)\s+([A-Za-z_$][\w$]*)/gu,
    (match, declarationType, name) => {
      exportedNames.set(name, name);
      return `${declarationType} ${name}`;
    }
  );

  transformed = transformed.replace(
    /export\s+(const|let|var)\s+([A-Za-z_$][\w$]*)/gu,
    (match, declarationType, name) => {
      exportedNames.set(name, name);
      return `${declarationType} ${name}`;
    }
  );

  transformed = transformed.replace(/export\s*\{([^}]+)\};?/gu, (match, specifiers) => {
    for (const rawPart of specifiers.split(',')) {
      const part = rawPart.trim();
      if (!part) {
        continue;
      }

      const aliasMatch = part.match(
        /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/u
      );

      if (!aliasMatch) {
        continue;
      }

      const localName = aliasMatch[1];
      const exportedName = aliasMatch[2] ?? localName;
      exportedNames.set(exportedName, localName);
    }

    return '';
  });

  const exportAssignments = Array.from(exportedNames.entries())
    .map(([exportedName, localName]) => {
      return `exports.${exportedName} = ${localName};`;
    })
    .join('\n');

  return `${transformed.trim()}\n${exportAssignments}\n`;
}

async function bundleContentScript(entryPath) {
  const modules = new Map();
  const seen = new Set();

  async function collectModule(filePath) {
    const normalizedPath = path.normalize(filePath);
    const moduleId = toModuleId(normalizedPath);

    if (seen.has(moduleId)) {
      return moduleId;
    }

    seen.add(moduleId);
    const source = await fs.readFile(normalizedPath, 'utf8');
    const dependenciesToCollect = [];
    const transformedCode = transformModuleCode(source, normalizedPath, (dependencyPath) => {
      const resolvedPath = dependencyPath.endsWith('.js')
        ? dependencyPath
        : `${dependencyPath}.js`;
      dependenciesToCollect.push(resolvedPath);
      return toModuleId(resolvedPath);
    });

    modules.set(moduleId, transformedCode);

    for (const dependencyPath of dependenciesToCollect) {
      await collectModule(dependencyPath);
    }

    return moduleId;
  }

  const entryModuleId = await collectModule(entryPath);
  const bundledModules = Array.from(modules.entries())
    .map(([moduleId, code]) => {
      return `${JSON.stringify(moduleId)}: (module, exports, __require) => {\n${code}\n}`;
    })
    .join(',\n');

  const bundledCode = `(() => {
const __modules = {
${bundledModules}
};
const __cache = {};
const __require = (moduleId) => {
  if (__cache[moduleId]) {
    return __cache[moduleId].exports;
  }
  const module = { exports: {} };
  __cache[moduleId] = module;
  __modules[moduleId](module, module.exports, __require);
  return module.exports;
};
__require(${JSON.stringify(entryModuleId)});
})();\n`;

  await fs.writeFile(entryPath, bundledCode, 'utf8');
}

async function main() {
  if (process.argv.includes('--clean')) {
    await removeDist();
    return;
  }

  await removeDist();
  await ensureDirectory(distDir);
  await buildDirectory(srcDir);
  await bundleContentScript(contentEntryPath);
}

main().catch((error) => {
  console.error('[build] failed', error);
  process.exitCode = 1;
});
