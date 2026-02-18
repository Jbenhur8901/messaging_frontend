import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Conditions d'utilisation - Flow by Nodes Technology",
  description: "Conditions d'utilisation de la plateforme Flow by Nodes Technology",
}

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <div className="space-y-2 mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">
            Conditions Generales d&apos;Utilisation
          </h1>
          <p className="text-muted-foreground">
            Derniere mise a jour : 17 fevrier 2025
          </p>
        </div>

        <div className="prose prose-neutral max-w-none space-y-8 text-foreground/90 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-foreground">
          {/* Article 1 */}
          <section className="space-y-4">
            <h2>Article 1 - Objet</h2>
            <p>
              Les presentes Conditions Generales d&apos;Utilisation (ci-apres &quot;CGU&quot;) ont pour objet de definir les
              modalites et conditions dans lesquelles la societe <strong>Nodes Technology</strong>, societe de droit
              congolais dont le siege social est situe a Brazzaville, Republique du Congo (ci-apres &quot;Nodes Technology&quot;,
              &quot;nous&quot;, &quot;notre&quot; ou &quot;nos&quot;), met a disposition sa plateforme <strong>Flow</strong> (ci-apres la
              &quot;Plateforme&quot;) et les services associes.
            </p>
            <p>
              L&apos;utilisation de la Plateforme implique l&apos;acceptation pleine et entiere des presentes CGU. Si vous
              n&apos;acceptez pas ces conditions, vous ne devez pas utiliser la Plateforme.
            </p>
          </section>

          {/* Article 2 */}
          <section className="space-y-4">
            <h2>Article 2 - Presentation de la Plateforme</h2>
            <p>
              <strong>Flow</strong> est une plateforme SaaS (Software as a Service) de gestion de campagnes marketing
              conversationnelles et d&apos;automatisation de la relation client. La Plateforme permet notamment :
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>La gestion et l&apos;envoi de campagnes via WhatsApp Business API</li>
              <li>La gestion de contacts et de listes de diffusion</li>
              <li>La creation et la gestion de templates de messages</li>
              <li>L&apos;automatisation de scenarios conversationnels</li>
              <li>Le suivi et l&apos;analyse des performances des campagnes</li>
              <li>La gestion de credits et de la facturation</li>
            </ul>
          </section>

          {/* Article 3 */}
          <section className="space-y-4">
            <h2>Article 3 - Editeur de la Plateforme</h2>
            <p>La Plateforme est editee par :</p>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm space-y-1">
              <p><strong>Nodes Technology</strong></p>
              <p>Societe privee independante</p>
              <p>Siege social : Brazzaville, Republique du Congo</p>
              <p>Annee de creation : 2023</p>
              <p>Secteur : Intelligence Artificielle, Automatisation, Technologies de l&apos;Information</p>
            </div>
          </section>

          {/* Article 4 */}
          <section className="space-y-4">
            <h2>Article 4 - Inscription et Compte Utilisateur</h2>

            <h3>4.1 Creation de compte</h3>
            <p>
              L&apos;acces a la Plateforme necessite la creation d&apos;un compte utilisateur. Lors de l&apos;inscription,
              l&apos;utilisateur s&apos;engage a fournir des informations exactes, completes et a jour. Toute information
              inexacte ou incomplete pourra entrainer la suspension ou la suppression du compte.
            </p>

            <h3>4.2 Securite du compte</h3>
            <p>
              L&apos;utilisateur est responsable de la confidentialite de ses identifiants de connexion (email et mot de
              passe). Il s&apos;engage a ne pas communiquer ses identifiants a des tiers. Toute activite realisee depuis
              son compte sera reputee effectuee par l&apos;utilisateur. L&apos;utilisateur doit informer immediatement
              Nodes Technology de toute utilisation non autorisee de son compte.
            </p>

            <h3>4.3 Authentification a deux facteurs</h3>
            <p>
              La Plateforme propose un systeme d&apos;authentification a deux facteurs (2FA). Nodes Technology recommande
              fortement l&apos;activation de cette fonctionnalite pour renforcer la securite du compte.
            </p>
          </section>

          {/* Article 5 */}
          <section className="space-y-4">
            <h2>Article 5 - Organisations et Acces Multi-utilisateurs</h2>
            <p>
              La Plateforme permet la creation d&apos;organisations regroupant plusieurs utilisateurs. L&apos;administrateur
              d&apos;une organisation est responsable de la gestion des membres, des roles et des permissions au sein de
              son organisation. Il s&apos;engage a n&apos;accorder l&apos;acces qu&apos;aux personnes autorisees.
            </p>
          </section>

          {/* Article 6 */}
          <section className="space-y-4">
            <h2>Article 6 - Credits et Facturation</h2>

            <h3>6.1 Systeme de credits</h3>
            <p>
              L&apos;utilisation de certains services de la Plateforme (envoi de messages WhatsApp, campagnes, etc.)
              est soumise a un systeme de credits. Les credits sont acquis par l&apos;utilisateur selon les tarifs en
              vigueur et sont debites au fur et a mesure de l&apos;utilisation des services.
            </p>

            <h3>6.2 Non-remboursement</h3>
            <p>
              Sauf disposition contraire expressement convenue, les credits acquis ne sont pas remboursables.
              Les credits non utilises ne sont pas reportables au-dela de la periode de validite definie lors
              de l&apos;achat, sauf mention contraire.
            </p>

            <h3>6.3 Tarification</h3>
            <p>
              Les tarifs des credits et des services sont communiques sur la Plateforme ou sur demande. Nodes
              Technology se reserve le droit de modifier ses tarifs a tout moment, sous reserve d&apos;en informer
              les utilisateurs prealablement.
            </p>
          </section>

          {/* Article 7 */}
          <section className="space-y-4">
            <h2>Article 7 - Utilisation Acceptable</h2>
            <p>L&apos;utilisateur s&apos;engage a utiliser la Plateforme de maniere loyale et conforme aux presentes CGU. Il est interdit de :</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Utiliser la Plateforme pour envoyer des messages non sollicites (spam)</li>
              <li>Envoyer des contenus illicites, diffamatoires, haineux, pornographiques ou portant atteinte aux droits de tiers</li>
              <li>Usurper l&apos;identite d&apos;un tiers ou d&apos;une organisation</li>
              <li>Tenter de contourner les mesures de securite de la Plateforme</li>
              <li>Utiliser la Plateforme a des fins de phishing, de fraude ou d&apos;escroquerie</li>
              <li>Revendre ou sous-licencier l&apos;acces a la Plateforme sans autorisation ecrite</li>
              <li>Collecter ou traiter des donnees personnelles en violation des lois applicables</li>
              <li>Perturber le fonctionnement de la Plateforme ou de ses infrastructures</li>
            </ul>
            <p>
              Tout manquement a ces obligations pourra entrainer la suspension ou la resiliation immediate du compte,
              sans prejudice des dommages et interets que Nodes Technology pourrait reclamer.
            </p>
          </section>

          {/* Article 8 */}
          <section className="space-y-4">
            <h2>Article 8 - Conformite WhatsApp Business</h2>
            <p>
              L&apos;utilisation de la Plateforme impliquant l&apos;API WhatsApp Business, l&apos;utilisateur s&apos;engage
              a respecter les <strong>Conditions d&apos;utilisation de WhatsApp Business</strong> et la <strong>Politique
              commerciale de WhatsApp</strong>. Nodes Technology ne saurait etre tenue responsable en cas de suspension
              ou de restriction du compte WhatsApp Business de l&apos;utilisateur resultant d&apos;une violation de ces politiques.
            </p>
          </section>

          {/* Article 9 */}
          <section className="space-y-4">
            <h2>Article 9 - Protection des Donnees Personnelles</h2>

            <h3>9.1 Responsabilite</h3>
            <p>
              L&apos;utilisateur est considere comme responsable du traitement des donnees personnelles de ses contacts
              qu&apos;il importe et gere via la Plateforme. Nodes Technology agit en qualite de sous-traitant au sens
              des lois applicables en matiere de protection des donnees.
            </p>

            <h3>9.2 Obligations de l&apos;utilisateur</h3>
            <p>L&apos;utilisateur s&apos;engage a :</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Disposer d&apos;une base legale valide pour le traitement des donnees personnelles de ses contacts (consentement, interet legitime, etc.)</li>
              <li>Respecter les droits des personnes concernees (acces, rectification, suppression, opposition)</li>
              <li>Ne pas importer de donnees personnelles obtenues de maniere illicite</li>
              <li>Informer ses contacts de l&apos;utilisation de leurs donnees</li>
            </ul>

            <h3>9.3 Mesures de securite</h3>
            <p>
              Nodes Technology met en oeuvre des mesures techniques et organisationnelles appropriees pour proteger
              les donnees personnelles traitees via la Plateforme contre tout acces non autorise, perte, destruction
              ou alteration.
            </p>
          </section>

          {/* Article 10 */}
          <section className="space-y-4">
            <h2>Article 10 - Propriete Intellectuelle</h2>
            <p>
              L&apos;ensemble des elements composant la Plateforme (logiciel, interface, code source, textes, graphismes,
              logos, marques, etc.) est la propriete exclusive de Nodes Technology ou de ses partenaires et est protege
              par les lois relatives a la propriete intellectuelle.
            </p>
            <p>
              L&apos;utilisateur ne dispose que d&apos;un droit d&apos;utilisation personnel, non exclusif et non cessible de la
              Plateforme, dans le cadre et pour la duree de son abonnement. Toute reproduction, representation,
              modification ou exploitation non autorisee est strictement interdite.
            </p>
          </section>

          {/* Article 11 */}
          <section className="space-y-4">
            <h2>Article 11 - Disponibilite et Maintenance</h2>
            <p>
              Nodes Technology s&apos;efforce d&apos;assurer la disponibilite de la Plateforme 24 heures sur 24, 7 jours sur 7.
              Toutefois, Nodes Technology ne garantit pas un fonctionnement ininterrompu et ne saurait etre tenue
              responsable des interruptions, qu&apos;elles soient programmees (maintenance) ou imprevues (panne, force majeure).
            </p>
            <p>
              Nodes Technology se reserve le droit de suspendre temporairement l&apos;acces a la Plateforme pour des
              operations de maintenance, de mise a jour ou d&apos;amelioration, en s&apos;efforcant d&apos;en informer les
              utilisateurs dans un delai raisonnable.
            </p>
          </section>

          {/* Article 12 */}
          <section className="space-y-4">
            <h2>Article 12 - Limitation de Responsabilite</h2>
            <p>
              La Plateforme est fournie &quot;en l&apos;etat&quot;. Nodes Technology ne saurait etre tenue responsable :
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Des dommages indirects, y compris les pertes de profit, de donnees, de chiffre d&apos;affaires ou d&apos;opportunites</li>
              <li>De l&apos;utilisation faite par l&apos;utilisateur de la Plateforme ou du contenu des messages envoyes</li>
              <li>Des dysfonctionnements lies aux reseaux, aux fournisseurs tiers (WhatsApp, hebergeurs, etc.) ou a des evenements de force majeure</li>
              <li>De la perte ou de l&apos;alteration de donnees resultant d&apos;une utilisation non conforme de la Plateforme</li>
            </ul>
            <p>
              En tout etat de cause, la responsabilite totale de Nodes Technology au titre des presentes CGU est
              limitee au montant des sommes effectivement versees par l&apos;utilisateur au cours des douze (12) mois
              precedant l&apos;evenement donnant lieu a responsabilite.
            </p>
          </section>

          {/* Article 13 */}
          <section className="space-y-4">
            <h2>Article 13 - Suspension et Resiliation</h2>

            <h3>13.1 Par l&apos;utilisateur</h3>
            <p>
              L&apos;utilisateur peut cesser d&apos;utiliser la Plateforme a tout moment. La suppression du compte peut etre
              demandee aupres de Nodes Technology. Les credits restants ne seront pas rembourses sauf disposition
              contraire.
            </p>

            <h3>13.2 Par Nodes Technology</h3>
            <p>
              Nodes Technology se reserve le droit de suspendre ou de resilier l&apos;acces d&apos;un utilisateur a la
              Plateforme, sans preavis ni indemnite, en cas de :
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Violation des presentes CGU</li>
              <li>Utilisation frauduleuse ou abusive de la Plateforme</li>
              <li>Non-paiement des sommes dues</li>
              <li>Demande des autorites competentes</li>
            </ul>
          </section>

          {/* Article 14 */}
          <section className="space-y-4">
            <h2>Article 14 - Modification des CGU</h2>
            <p>
              Nodes Technology se reserve le droit de modifier les presentes CGU a tout moment. Les utilisateurs
              seront informes de toute modification substantielle par notification sur la Plateforme ou par email.
              La poursuite de l&apos;utilisation de la Plateforme apres modification vaut acceptation des nouvelles CGU.
            </p>
          </section>

          {/* Article 15 */}
          <section className="space-y-4">
            <h2>Article 15 - Droit Applicable et Litiges</h2>
            <p>
              Les presentes CGU sont regies par le droit de la Republique du Congo. En cas de litige, les parties
              s&apos;engagent a rechercher une solution amiable. A defaut d&apos;accord, le litige sera soumis aux
              juridictions competentes de Brazzaville, Republique du Congo.
            </p>
          </section>

          {/* Article 16 */}
          <section className="space-y-4">
            <h2>Article 16 - Contact</h2>
            <p>
              Pour toute question relative aux presentes CGU ou a l&apos;utilisation de la Plateforme, vous pouvez
              contacter Nodes Technology :
            </p>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm space-y-1">
              <p><strong>Nodes Technology</strong></p>
              <p>Brazzaville, Republique du Congo</p>
              <p>Email : contact@nodestechnology.com</p>
            </div>
          </section>

          {/* Separator */}
          <hr className="border-border/60" />

          <p className="text-sm text-muted-foreground">
            En utilisant la plateforme Flow, vous reconnaissez avoir lu, compris et accepte les presentes
            Conditions Generales d&apos;Utilisation.
          </p>
        </div>
      </div>
    </div>
  )
}
