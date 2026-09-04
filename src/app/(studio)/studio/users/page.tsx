import type { Metadata } from 'next';
import { UsersTable } from '@/components/studio/UsersTable';

export const metadata: Metadata = { title: 'Personas · Studio' };

export default function UsersPage() {
  return (
    <>
      <h1>Personas</h1>
      <p className="studio__sub">
        Búsqueda que pliega acentos: «muno» encuentra a Muñoz. Filas virtualizadas para que teclear no
        cueste 15,000 nodos.
      </p>
      <UsersTable />
    </>
  );
}
