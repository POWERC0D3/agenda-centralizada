import { ajustarGrupo, CICLOS, CURSOS, datosDelGrupo, letrasDe, SOLO_CONFIGURADOS, type Grupo } from '../../lib/grupos'
import { Carrusel } from '../ui/Carrusel'

type Props = { grupo: Grupo; onCambio: (g: Grupo) => void }

/**
 * Los tres carruseles para elegir tu grupo (en Ajustes) y si ya hay datos de él.
 * Solo se puede elegir un grupo que exista: el carrusel de la letra ofrece las letras de ese ciclo y curso,
 * y al cambiar de ciclo o de curso la letra se ajusta sola (p. ej. DAW 1º A → DAM → DAM 1º B).
 */
export function ElegirGrupo({ grupo, onCambio }: Props) {
  const hayDatos = datosDelGrupo(grupo) !== null
  return (
    <div>
      <div className="flex justify-center gap-2 border border-linea bg-fondo-alto/60 px-4 py-5 sm:gap-10">
        <Carrusel etiqueta="Ciclo" opciones={CICLOS} valor={grupo.ciclo} onCambio={(ciclo) => onCambio(ajustarGrupo({ ...grupo, ciclo }))} />
        <Carrusel etiqueta="Curso" opciones={CURSOS} valor={grupo.curso} onCambio={(curso) => onCambio(ajustarGrupo({ ...grupo, curso }))} />
        <Carrusel
          etiqueta="Grupo"
          opciones={letrasDe(grupo.ciclo, grupo.curso)}
          valor={grupo.letra}
          onCambio={(letra) => onCambio({ ...grupo, letra })}
        />
      </div>
      <p className={`mt-3 flex items-center gap-2 text-xs ${hayDatos ? 'text-tinta' : 'text-tinta-suave'}`}>
        <span className={`size-1.5 ${hayDatos ? 'bg-verde' : 'bg-linea'}`} aria-hidden="true" />
        {hayDatos ? 'Horario y exámenes cargados' : `Aún sin horario ni exámenes de este grupo. ${SOLO_CONFIGURADOS}.`}
      </p>
    </div>
  )
}
