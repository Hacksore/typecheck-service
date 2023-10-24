import { Hono } from 'hono/quick';
import {
	CompilerHost,
	createProgram,
	createSourceFile,
	flattenDiagnosticMessageText,
	getLineAndCharacterOfPosition,
	getPreEmitDiagnostics,
	ModuleKind,
	ScriptKind,
	ScriptTarget,
} from 'typescript';
import { z } from 'zod';

type Bindings = {
	TYPEDEFS: R2Bucket;
};

const app = new Hono < { Bindings: Bindings } > ();

const TYPESCRIPT_VERSION = '5.2.2';

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

const standardLibCodeDefs: Record<string, string> = {};
function typecheck({ code, testCase }: { code: string; testCase: string }) {
	console.log('in typecheck', Object.keys(standardLibCodeDefs));

	console.log('starting typescheck for', { code, testCase });
	const testCaseFile = createSourceFile('test.ts', testCase, ScriptTarget.ESNext, true, ScriptKind.TS);
	const userFile = createSourceFile('user.ts', code, ScriptTarget.ESNext, true, ScriptKind.TS);

	// This is needed
	console.log('creating compiler host');
	const compilerHost: CompilerHost = {
		fileExists: (fileName) => [testCaseFile.fileName, userFile.fileName].includes(fileName),
		getSourceFile: (fileName) => {
			console.log('getting source file', { fileName });
			for (const libName of standardLibs) {
				if (fileName === libName) {
					const libCode = standardLibCodeDefs[libName];
					return createSourceFile(libName, libCode, ScriptTarget.ESNext, true, ScriptKind.TS);
				}
			}

			// load our file that has our input code
			if (fileName === userFile.fileName) return userFile;
			if (fileName === testCaseFile.fileName) return testCaseFile;
		},
		getDefaultLibFileName: () => 'lib.d.ts',
		writeFile: () => { },
		getCurrentDirectory: () => '/',
		getCanonicalFileName: (f) => f.toLowerCase(),
		getNewLine: () => '\n',
		useCaseSensitiveFileNames: () => false,
		readFile: (fileName) => (fileName === userFile.fileName ? userFile.text : undefined),
	};

	console.log('creating program');
	const program = createProgram(
		[testCaseFile.fileName, userFile.fileName],
		{
			allowJs: true,
			noEmit: true,
			noEmitOnError: true,
			noImplicitAny: true,
			target: ScriptTarget.ESNext,
			module: ModuleKind.ESNext,
		},
		compilerHost,
	);

	const allDiagnostics = getPreEmitDiagnostics(program);
	const errors: string[] = [];

	console.log('checking for errors');
	allDiagnostics.forEach((diagnostic) => {
		if (diagnostic.file) {
			const { line, character } = getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
			const message = flattenDiagnosticMessageText(diagnostic.messageText, '\n');
			const errorMessage = `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`;
			console.log(errorMessage);
			errors.push(errorMessage);
		} else {
			const errorMessage = flattenDiagnosticMessageText(diagnostic.messageText, '\n');
			console.log(errorMessage);
			errors.push(errorMessage);
		}
	});

	return {
		errors,
	};
}

const codeTestSchema = z.object({
	code: z.string(),
	testCase: z.string(),
});

type CodeTest = z.infer<typeof codeTestSchema>;

app.post('/api/test', async (ctx) => {
	const body = await ctx.req.json < CodeTest > ();

	// let it rip
	try {
		codeTestSchema.parse(body);
	} catch (err) {
		console.error('could not parse the schema');
		return ctx.json({
			error: 'could not parse the schema',
		});
	}

	console.log('start loop to read');
	const requestStartTime = Date.now();
	for (const lib of standardLibs) {
		const libObject = await ctx.env.TYPEDEFS.get(`typescript/v${TYPESCRIPT_VERSION}/${lib}`);
		if (libObject !== null) {
			standardLibCodeDefs[lib] = await libObject.text();
		}
	}

	const executionTime = Date.now() - requestStartTime;
	console.log('time to get r2 libs', executionTime, 'ms');
	console.log(`loaded ${Object.keys(standardLibCodeDefs).length} libs`);

	const { code, testCase } = body;

	try {
		console.log('starting typecheck');
		const errors = typecheck({ code, testCase });
		console.log('done with typecheck');
		return ctx.json(errors);
	} catch (err: any) {
		return ctx.json({
			errror: err.message,
		});
	}
});

export default app;
