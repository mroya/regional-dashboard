const { parseNum } = require('../app/utils/formatters');
const fs = require('fs');

const data = {
  departamentos: [
    {
      id: 'SUMMARY',
      vdaEft: '10.770.144',
      departamento: 'MED',
      projecao: '14.913.717',
      vlrDesvio: '423.972',
      desvioPerc: '4,10%',
      alvo: '14.326.631'
    },
    {
      desvioPerc: '5,20%',
      alvo: '6.457.206',
      id: 'SUMMARY',
      projecao: '6.793.166',
      vdaEft: '4.906.911',
      departamento: 'HB (N-MED)',
      vlrDesvio: '242.674'
    },
    {
      id: 'SUMMARY',
      departamento: 'CLINIC',
      vlrDesvio: '-32.119',
      projecao: '283.691',
      vdaEft: '205.843',
      desvioPerc: '-13,50%',
      alvo: '327.957'
    },
    {
      vlrDesvio: '634.528',
      vdaEft: '15.882.898',
      departamento: 'GERAL',
      projecao: '21.990.315',
      id: 'SUMMARY',
      alvo: '21.111.794',
      desvioPerc: '4,16%'
    }
  ]
};

const mainDept = (data.departamentos || []).find(d => d.departamento?.toUpperCase() === 'GERAL' && (!d.id || d.id === 'SUMMARY')) || 
                 (data.departamentos || []).find(d => d.departamento?.toUpperCase().includes('MED') && (!d.id || d.id === 'SUMMARY')) || {};

console.log('mainDept:', mainDept);
const mainVdaEft = parseNum(mainDept.vdaEft);
const mainAlvo = parseNum(mainDept.alvo) || parseNum(mainDept.metaDia);
console.log('mainVdaEft:', mainVdaEft, 'mainAlvo:', mainAlvo);
const perfGeralVal = mainAlvo > 0 ? (mainVdaEft / mainAlvo) * 100 : 0;
const performanceGeral = perfGeralVal > 0 ? perfGeralVal.toFixed(1).replace('.', ',') + '%' : '0%';
console.log('performanceGeral:', performanceGeral);
