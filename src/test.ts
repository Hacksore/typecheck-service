import ts from 'typescript';

function typecheck(code: string) {
	console.log(`Type checking the following code:\n${code}\n`);
	// Create a SourceFile from TypeScript code
	const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);

	sourceFile.forEachChild((node) => console.log("flag", node.kind));

	const program = ts.createProgram({
		rootNames: [sourceFile.fileName],
		options: {
			esModuleInterop: true,
			module: ts.ModuleKind.ESNext,
			target: ts.ScriptTarget.ESNext,
		},
	});

	// Get diagnostics (errors) for the source file
	const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile);

	// Check if there are any errors
	if (diagnostics.length > 0) {
		console.log('Errors found:');
		diagnostics.forEach((diagnostic) => {
			if (diagnostic.file) {
				const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
				const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
				console.log(`Error at ${line + 1}, character ${character + 1}: ${message}`);
			} else {
				console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
			}
		});
	} else {
		console.log('No errors found.');
	}
}

try {
	const CODE = ``;
	console.log(typecheck(CODE));
	// eslint-disable-next-line 
} catch (err: any) {
	console.log(err.message);
}
