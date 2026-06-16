// Initialisation de pdfmake côté renderer (avec les polices Roboto embarquées).
// Les sous-chemins de build ne sont pas typés : on caste en `any`, ce qui est
// sans risque ici car l'usage est encapsulé dans documents.ts.
/* eslint-disable @typescript-eslint/no-explicit-any */
import pdfMakeImport from 'pdfmake/build/pdfmake'
import pdfFontsImport from 'pdfmake/build/vfs_fonts'

const pdfMake: any = pdfMakeImport
const fonts: any = pdfFontsImport

// Selon la version de pdfmake, le vfs est exposé différemment. En 0.2.23,
// `vfs_fonts` exporte directement l'objet vfs (module.exports = vfs), d'où le
// fallback final sur `fonts` lui-même.
const vfs = fonts?.vfs ?? fonts?.pdfMake?.vfs ?? fonts?.default?.vfs ?? fonts
if (vfs) pdfMake.vfs = vfs

export default pdfMake
