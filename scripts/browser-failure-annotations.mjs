const escapeData=value=>String(value).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
// Add alongside the existing list/html reporters. Never change outcomes.
export default class BrowserFailureAnnotations {
 onTestEnd(test,result){
  if(result.status==='skipped'||result.status===test.expectedStatus)return;
  const project=test.parent.project();
  const engine=project?.name||'unknown-project';
  const title=test.titlePath().slice(2).join(' > ')||test.title;
  process.stdout.write(`::error title=Browser test failure::${escapeData(`[${engine}] ${title}`)}\n`);
 }
 // A runner failure before any test must not masquerade as a named test.
 onError(){process.stdout.write('::error title=Browser runner failure::No test identity is available; consult the job status.\n');}
}
