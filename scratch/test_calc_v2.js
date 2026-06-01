const { parseNum } = require('../app/utils/formatters');

const test = (data) => {
    let performanceGeral = data.geral?.performanceGeral || '0%';
    if (performanceGeral === '-' || performanceGeral === '0%') {
      const mainDept = (data.departamentos || []).find(d => d.departamento?.toUpperCase() === 'GERAL' && (!d.id || d.id === 'SUMMARY')) || 
                       (data.departamentos || []).find(d => d.departamento?.toUpperCase().includes('MED') && (!d.id || d.id === 'SUMMARY')) || {};
      const mainVdaEft = parseNum(mainDept.vdaEft) || parseNum(data.geral?.vdaEft) || parseNum(data.geral?.venda);
      const mainAlvo = parseNum(mainDept.alvo) || parseNum(mainDept.metaDia) || parseNum(data.geral?.alvo) || parseNum(data.geral?.meta);
      const perfGeralVal = mainAlvo > 0 ? (mainVdaEft / mainAlvo) * 100 : 0;
      if (perfGeralVal > 0) {
        performanceGeral = perfGeralVal.toFixed(1).replace('.', ',') + '%';
      }
    } else {
      performanceGeral = performanceGeral.replace('.', ',');
    }
    return performanceGeral;
};

console.log('Result for data with summary GERAL dept:', test({
  geral: { performanceGeral: '-' },
  departamentos: [{ departamento: 'GERAL', id: 'SUMMARY', vdaEft: '15.882.898', alvo: '21.111.794' }]
}));

console.log('Result for data with only geral.vdaEft and geral.alvo:', test({
  geral: { performanceGeral: '-', vdaEft: '15.882.898', alvo: '21.111.794' },
  departamentos: []
}));

console.log('Result for data with already parsed performanceGeral:', test({
  geral: { performanceGeral: '75.2%' },
  departamentos: []
}));
