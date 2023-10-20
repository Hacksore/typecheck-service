import { Hono } from 'hono/quick';
import ts from 'typescript';

const app = new Hono();

// TODO: impl
async function readFromR2(libName: string): Promise<string> {
	console.log(`Fetching the lib for ${libName}`);
	return 'test';
}

/* IDEA:

Problem we can't read from the filesystem in a worker to get all the standardLibs

Solution:
- use R2 to store the libs extracted from typescript package
- when the function boots up it will fetch them and get the string values for each one

We need to see how fast reading all the d.ts files is, if it's slow we will have to do k/v to speed it up
*/

// NOTE: im not sure which ones we actually need
const standardLibs = [
	'lib.decorators.d.ts',
	'lib.decorators.legacy.d.ts',
	'lib.d.ts',
	'lib.es5.d.ts',
	'lib.webworker.importscripts.d.ts',
	'lib.scripthost.d.ts',
	'lib.dom.d.ts',
	'lib.esnext.d.ts',
];

async function loadStandardLib(libName: string) {
	// fetch the native lib from the db
	const nativeLib = await readFromR2(libName);
	return nativeLib;
}

const standardLibCodeDefs: Record<string, string> = {};
async function typecheck({ code, testCase }: { code: string; testCase: string }) {
	console.log(`Type checking the following code:\n${code}\n`);

	// read all the standard libs from r2
	for (const lib of standardLibs) {
		standardLibCodeDefs[lib] = await loadStandardLib(lib);
	}

	// for now we just concat the code and testCase but it might make more sense to split this into two files?
	const file = ts.createSourceFile('index.ts', `${code}\n${testCase}`, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);

	// This is needed
	const compilerHost: ts.CompilerHost = {
		fileExists: (fileName) => fileName === file.fileName,
		getSourceFile: (fileName) => {
			for (const libName of standardLibs) {
				if (libName === fileName) {
					return ts.createSourceFile(libName, standardLibCodeDefs[libName], ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
				}
			}
			// read the dts file from node modules
			if (fileName === file.fileName) return file;
		},
		getDefaultLibFileName: () => 'lib.d.ts',
		writeFile: () => { },
		getCurrentDirectory: () => '/',
		getCanonicalFileName: (f) => f.toLowerCase(),
		getNewLine: () => '\n',
		useCaseSensitiveFileNames: () => false,
		readFile: (fileName) => (fileName === file.fileName ? file.text : undefined),
	};

	const program = ts.createProgram(
		[file.fileName],
		{
			allowJs: true,
			noEmit: true,
			noEmitOnError: true,
			noImplicitAny: true,
			target: ts.ScriptTarget.ESNext,
			module: ts.ModuleKind.ESNext,
		},
		compilerHost,
	);

	const allDiagnostics = ts.getPreEmitDiagnostics(program);
	const errors: string[] = [];

	allDiagnostics.forEach((diagnostic) => {
		if (diagnostic.file) {
			const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
			const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
			const errorMessage = `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`;
			console.log(errorMessage);
			errors.push(errorMessage);
		} else {
			const errorMessage = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
			console.log(errorMessage);
			errors.push(errorMessage);
		}
	});

	return {
		errors,
	};
}

// TODO: add zod
app.post('/api/test', async (c) => {
	const { code, testCase } = await c.req.parseBody();

	const result = typecheck({ code, testCase });
	try {
		return c.json({
			result,
		});
	} catch (e) {
		console.log(e);
	}
});

export default app;
