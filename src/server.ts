import { Hono } from 'hono/quick';
import ts from 'typescript';

const app = new Hono();

function readFromDb(libName: string): string {
	console.log(`Fetching the lib for ${libName}`);
	// throw new Error('Function not implemented.');
	return 'test';
}

/* IDEA:

Problem we can't read from the filesystem so we have to think of another way to get all the built ins so that typechecking will work 

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

function loadStandardLib(libName: string) {
	// fetch the native lib from the db
	const nativeLib = readFromDb(libName);
	return ts.createSourceFile(libName, nativeLib, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
}

function typecheck({ code, testCase }: { code: string; testCase: string }) {
	console.log(`Type checking the following code:\n${code}\n`);

	const file = ts.createSourceFile('index.ts', `${code}\n${testCase}`, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);

	// This is needed
	const compilerHost: ts.CompilerHost = {
		fileExists: (fileName) => fileName === file.fileName,
		getSourceFile: (fileName) => {
			for (const lib of standardLibs) {
				if (fileName === lib) return loadStandardLib(lib);
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
			console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
			errors.push(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
		} else {
			console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
			errors.push(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
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
