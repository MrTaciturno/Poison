// Utility for reading and parsing .poise files
export function parsePoiseFile(fileContent) {
  try {
    const data = JSON.parse(fileContent);
    return {
      success: true,
      data
    };
  } catch (err) {
    return {
      success: false,
      error: 'Arquivo .poise inválido ou corrompido.'
    };
  }
}

export function exportPoiseFile(sheetObj, filename = 'personagem.poise') {
  const jsonStr = JSON.stringify(sheetObj, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.poise') ? filename : `${filename}.poise`;
  a.click();
  URL.revokeObjectURL(url);
}
