import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, FileText, Building2, UserCheck, Shield, CreditCard, Scale, MessageSquare, Lock, Copyright, Server, AlertTriangle, Ban, PenLine, Gavel, Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = {
  title: "Conditions d'utilisation - Flow by Nodes Technology",
  description: "Conditions d'utilisation de la plateforme Flow by Nodes Technology",
}

const stagger = (i: number) => ({
  opacity: 0,
  animation: `fadeIn 0.45s ease-out ${i * 0.06}s forwards`,
})

function Section({
  icon: Icon,
  title,
  index,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  index: number
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3" style={stagger(index)}>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </h2>
      </div>
      <div className="rounded-xl border border-border/40 p-5 space-y-4">
        {children}
      </div>
    </div>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[13px] font-medium text-foreground">{title}</h3>
      {children}
    </div>
  )
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] leading-relaxed text-foreground/80">{children}</p>
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-1.5 pl-4">
      {items.map((item, i) => (
        <li key={i} className="text-[13px] leading-relaxed text-foreground/80 list-disc">
          {item}
        </li>
      ))}
    </ul>
  )
}

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          style={stagger(0)}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour
        </Link>

        {/* Header */}
        <div className="mb-8" style={stagger(1)}>
          <h1 className="text-xl font-semibold tracking-tight">
            Conditions G&eacute;n&eacute;rales d&apos;Utilisation
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[13px] text-muted-foreground">
              Flow by Nodes Technology
            </p>
            <Badge variant="secondary" className="text-[10px]">
              Mise &agrave; jour : 17 f&eacute;vrier 2025
            </Badge>
          </div>
        </div>

        {/* Articles */}
        <div className="space-y-5">
          {/* Article 1 */}
          <Section icon={FileText} title="Article 1 - Objet" index={2}>
            <Paragraph>
              Les pr&eacute;sentes Conditions G&eacute;n&eacute;rales d&apos;Utilisation (ci-apr&egrave;s &laquo; CGU &raquo;) ont pour objet de d&eacute;finir les
              modalit&eacute;s et conditions dans lesquelles l&apos;entreprise <strong>Ets NODES TECHNOLOGIE</strong> (nom commercial : NODES TECHNOLOGY),
              entreprise individuelle de droit congolais dont le si&egrave;ge social est situ&eacute; &agrave; Brazzaville, R&eacute;publique du Congo,
              immatricul&eacute;e au RCCM sous le num&eacute;ro CG-BZV-01-2023-A10-02101 (ci-apr&egrave;s &laquo; Nodes Technology &raquo;,
              &laquo; nous &raquo;, &laquo; notre &raquo; ou &laquo; nos &raquo;), met &agrave; disposition sa plateforme <strong>Flow</strong> (ci-apr&egrave;s la
              &laquo; Plateforme &raquo;) et les services associ&eacute;s.
            </Paragraph>
            <Paragraph>
              L&apos;utilisation de la Plateforme implique l&apos;acceptation pleine et enti&egrave;re des pr&eacute;sentes CGU. Si vous
              n&apos;acceptez pas ces conditions, vous ne devez pas utiliser la Plateforme.
            </Paragraph>
          </Section>

          {/* Article 2 */}
          <Section icon={Building2} title="Article 2 - Pr&eacute;sentation de la Plateforme" index={3}>
            <Paragraph>
              <strong>Flow</strong> est une plateforme SaaS (Software as a Service) de gestion de campagnes marketing
              conversationnelles et d&apos;automatisation de la relation client. La Plateforme permet notamment :
            </Paragraph>
            <List
              items={[
                "La gestion et l'envoi de campagnes via WhatsApp Business API",
                "La gestion de contacts et de listes de diffusion",
                "La cr\u00e9ation et la gestion de templates de messages",
                "L'automatisation de sc\u00e9narios conversationnels",
                "Le suivi et l'analyse des performances des campagnes",
                "La gestion de cr\u00e9dits et de la facturation",
              ]}
            />
          </Section>

          {/* Article 3 */}
          <Section icon={Building2} title="Article 3 - &Eacute;diteur de la Plateforme" index={4}>
            <Paragraph>La Plateforme est &eacute;dit&eacute;e par :</Paragraph>
            <div className="rounded-lg border border-border/40 bg-muted/30 p-4 space-y-3">
              <div className="space-y-0.5">
                <p className="text-[13px] font-medium">Ets NODES TECHNOLOGIE</p>
                <p className="text-[12px] text-muted-foreground">Nom commercial : NODES TECHNOLOGY</p>
                <p className="text-[12px] text-muted-foreground">Forme juridique : Entreprise Individuelle (ETS)</p>
                <p className="text-[12px] text-muted-foreground">Activit&eacute; principale : Programmation informatique &mdash; D&eacute;veloppement et gestion des solutions num&eacute;riques</p>
                <p className="text-[12px] text-muted-foreground">Si&egrave;ge social : Brazzaville, R&eacute;publique du Congo</p>
                <p className="text-[12px] text-muted-foreground">Date de cr&eacute;ation : 29 novembre 2023</p>
              </div>
              <div className="border-t border-border/40 pt-3 space-y-0.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Immatriculations</p>
                <p className="text-[12px] text-muted-foreground">RCCM : CG-BZV-01-2023-A10-02101</p>
                <p className="text-[12px] text-muted-foreground">NIU : P23000000460555T</p>
                <p className="text-[12px] text-muted-foreground">N&deg; SCIEN : 2033364</p>
                <p className="text-[12px] text-muted-foreground">N&deg; SCIET : 2033364015</p>
                <p className="text-[12px] text-muted-foreground">Autorisation commerciale : AEXE02588EI1870BZV201223/MCAC/DGCI/DPCN</p>
              </div>
            </div>
          </Section>

          {/* Article 4 */}
          <Section icon={UserCheck} title="Article 4 - Inscription et Compte Utilisateur" index={5}>
            <SubSection title="4.1 Cr&eacute;ation de compte">
              <Paragraph>
                L&apos;acc&egrave;s &agrave; la Plateforme n&eacute;cessite la cr&eacute;ation d&apos;un compte utilisateur. Lors de l&apos;inscription,
                l&apos;utilisateur s&apos;engage &agrave; fournir des informations exactes, compl&egrave;tes et &agrave; jour. Toute information
                inexacte ou incompl&egrave;te pourra entra&icirc;ner la suspension ou la suppression du compte.
              </Paragraph>
            </SubSection>
            <SubSection title="4.2 S&eacute;curit&eacute; du compte">
              <Paragraph>
                L&apos;utilisateur est responsable de la confidentialit&eacute; de ses identifiants de connexion (email et mot de
                passe). Il s&apos;engage &agrave; ne pas communiquer ses identifiants &agrave; des tiers. Toute activit&eacute; r&eacute;alis&eacute;e depuis
                son compte sera r&eacute;put&eacute;e effectu&eacute;e par l&apos;utilisateur. L&apos;utilisateur doit informer imm&eacute;diatement
                Nodes Technology de toute utilisation non autoris&eacute;e de son compte.
              </Paragraph>
            </SubSection>
            <SubSection title="4.3 Authentification &agrave; deux facteurs">
              <Paragraph>
                La Plateforme propose un syst&egrave;me d&apos;authentification &agrave; deux facteurs (2FA). Nodes Technology recommande
                fortement l&apos;activation de cette fonctionnalit&eacute; pour renforcer la s&eacute;curit&eacute; du compte.
              </Paragraph>
            </SubSection>
          </Section>

          {/* Article 5 */}
          <Section icon={Shield} title="Article 5 - Organisations et Acc&egrave;s Multi-utilisateurs" index={6}>
            <Paragraph>
              La Plateforme permet la cr&eacute;ation d&apos;organisations regroupant plusieurs utilisateurs. L&apos;administrateur
              d&apos;une organisation est responsable de la gestion des membres, des r&ocirc;les et des permissions au sein de
              son organisation. Il s&apos;engage &agrave; n&apos;accorder l&apos;acc&egrave;s qu&apos;aux personnes autoris&eacute;es.
            </Paragraph>
          </Section>

          {/* Article 6 */}
          <Section icon={CreditCard} title="Article 6 - Cr&eacute;dits et Facturation" index={7}>
            <SubSection title="6.1 Syst&egrave;me de cr&eacute;dits">
              <Paragraph>
                L&apos;utilisation de certains services de la Plateforme (envoi de messages WhatsApp, campagnes, etc.)
                est soumise &agrave; un syst&egrave;me de cr&eacute;dits. Les cr&eacute;dits sont acquis par l&apos;utilisateur selon les tarifs en
                vigueur et sont d&eacute;bit&eacute;s au fur et &agrave; mesure de l&apos;utilisation des services.
              </Paragraph>
            </SubSection>
            <SubSection title="6.2 Non-remboursement">
              <Paragraph>
                Sauf disposition contraire express&eacute;ment convenue, les cr&eacute;dits acquis ne sont pas remboursables.
                Les cr&eacute;dits non utilis&eacute;s ne sont pas reportables au-del&agrave; de la p&eacute;riode de validit&eacute; d&eacute;finie lors
                de l&apos;achat, sauf mention contraire.
              </Paragraph>
            </SubSection>
            <SubSection title="6.3 Tarification">
              <Paragraph>
                Les tarifs des cr&eacute;dits et des services sont communiqu&eacute;s sur la Plateforme ou sur demande. Nodes
                Technology se r&eacute;serve le droit de modifier ses tarifs &agrave; tout moment, sous r&eacute;serve d&apos;en informer
                les utilisateurs pr&eacute;alablement.
              </Paragraph>
            </SubSection>
          </Section>

          {/* Article 7 */}
          <Section icon={Scale} title="Article 7 - Utilisation Acceptable" index={8}>
            <Paragraph>
              L&apos;utilisateur s&apos;engage &agrave; utiliser la Plateforme de mani&egrave;re loyale et conforme aux pr&eacute;sentes CGU. Il est interdit de :
            </Paragraph>
            <List
              items={[
                "Utiliser la Plateforme pour envoyer des messages non sollicit\u00e9s (spam)",
                "Envoyer des contenus illicites, diffamatoires, haineux, pornographiques ou portant atteinte aux droits de tiers",
                "Usurper l'identit\u00e9 d'un tiers ou d'une organisation",
                "Tenter de contourner les mesures de s\u00e9curit\u00e9 de la Plateforme",
                "Utiliser la Plateforme \u00e0 des fins de phishing, de fraude ou d'escroquerie",
                "Revendre ou sous-licencier l'acc\u00e8s \u00e0 la Plateforme sans autorisation \u00e9crite",
                "Collecter ou traiter des donn\u00e9es personnelles en violation des lois applicables",
                "Perturber le fonctionnement de la Plateforme ou de ses infrastructures",
              ]}
            />
            <Paragraph>
              Tout manquement &agrave; ces obligations pourra entra&icirc;ner la suspension ou la r&eacute;siliation imm&eacute;diate du compte,
              sans pr&eacute;judice des dommages et int&eacute;r&ecirc;ts que Nodes Technology pourrait r&eacute;clamer.
            </Paragraph>
          </Section>

          {/* Article 8 */}
          <Section icon={MessageSquare} title="Article 8 - Conformit&eacute; WhatsApp Business" index={9}>
            <Paragraph>
              L&apos;utilisation de la Plateforme impliquant l&apos;API WhatsApp Business, l&apos;utilisateur s&apos;engage
              &agrave; respecter les <strong>Conditions d&apos;utilisation de WhatsApp Business</strong> et la <strong>Politique
              commerciale de WhatsApp</strong>. Nodes Technology ne saurait &ecirc;tre tenue responsable en cas de suspension
              ou de restriction du compte WhatsApp Business de l&apos;utilisateur r&eacute;sultant d&apos;une violation de ces politiques.
            </Paragraph>
          </Section>

          {/* Article 9 */}
          <Section icon={Lock} title="Article 9 - Protection des Donn&eacute;es Personnelles" index={10}>
            <SubSection title="9.1 Responsabilit&eacute;">
              <Paragraph>
                L&apos;utilisateur est consid&eacute;r&eacute; comme responsable du traitement des donn&eacute;es personnelles de ses contacts
                qu&apos;il importe et g&egrave;re via la Plateforme. Nodes Technology agit en qualit&eacute; de sous-traitant au sens
                des lois applicables en mati&egrave;re de protection des donn&eacute;es.
              </Paragraph>
            </SubSection>
            <SubSection title="9.2 Obligations de l'utilisateur">
              <Paragraph>L&apos;utilisateur s&apos;engage &agrave; :</Paragraph>
              <List
                items={[
                  "Disposer d'une base l\u00e9gale valide pour le traitement des donn\u00e9es personnelles de ses contacts (consentement, int\u00e9r\u00eat l\u00e9gitime, etc.)",
                  "Respecter les droits des personnes concern\u00e9es (acc\u00e8s, rectification, suppression, opposition)",
                  "Ne pas importer de donn\u00e9es personnelles obtenues de mani\u00e8re illicite",
                  "Informer ses contacts de l'utilisation de leurs donn\u00e9es",
                ]}
              />
            </SubSection>
            <SubSection title="9.3 Mesures de s&eacute;curit&eacute;">
              <Paragraph>
                Nodes Technology met en &#339;uvre des mesures techniques et organisationnelles appropri&eacute;es pour prot&eacute;ger
                les donn&eacute;es personnelles trait&eacute;es via la Plateforme contre tout acc&egrave;s non autoris&eacute;, perte, destruction
                ou alt&eacute;ration.
              </Paragraph>
            </SubSection>
          </Section>

          {/* Article 10 */}
          <Section icon={Copyright} title="Article 10 - Propri&eacute;t&eacute; Intellectuelle" index={11}>
            <Paragraph>
              L&apos;ensemble des &eacute;l&eacute;ments composant la Plateforme (logiciel, interface, code source, textes, graphismes,
              logos, marques, etc.) est la propri&eacute;t&eacute; exclusive de Nodes Technology ou de ses partenaires et est prot&eacute;g&eacute;
              par les lois relatives &agrave; la propri&eacute;t&eacute; intellectuelle.
            </Paragraph>
            <Paragraph>
              L&apos;utilisateur ne dispose que d&apos;un droit d&apos;utilisation personnel, non exclusif et non cessible de la
              Plateforme, dans le cadre et pour la dur&eacute;e de son abonnement. Toute reproduction, repr&eacute;sentation,
              modification ou exploitation non autoris&eacute;e est strictement interdite.
            </Paragraph>
          </Section>

          {/* Article 11 */}
          <Section icon={Server} title="Article 11 - Disponibilit&eacute; et Maintenance" index={12}>
            <Paragraph>
              Nodes Technology s&apos;efforce d&apos;assurer la disponibilit&eacute; de la Plateforme 24 heures sur 24, 7 jours sur 7.
              Toutefois, Nodes Technology ne garantit pas un fonctionnement ininterrompu et ne saurait &ecirc;tre tenue
              responsable des interruptions, qu&apos;elles soient programm&eacute;es (maintenance) ou impr&eacute;vues (panne, force majeure).
            </Paragraph>
            <Paragraph>
              Nodes Technology se r&eacute;serve le droit de suspendre temporairement l&apos;acc&egrave;s &agrave; la Plateforme pour des
              op&eacute;rations de maintenance, de mise &agrave; jour ou d&apos;am&eacute;lioration, en s&apos;effor&ccedil;ant d&apos;en informer les
              utilisateurs dans un d&eacute;lai raisonnable.
            </Paragraph>
          </Section>

          {/* Article 12 */}
          <Section icon={AlertTriangle} title="Article 12 - Limitation de Responsabilit&eacute;" index={13}>
            <Paragraph>
              La Plateforme est fournie &laquo; en l&apos;&eacute;tat &raquo;. Nodes Technology ne saurait &ecirc;tre tenue responsable :
            </Paragraph>
            <List
              items={[
                "Des dommages indirects, y compris les pertes de profit, de donn\u00e9es, de chiffre d'affaires ou d'opportunit\u00e9s",
                "De l'utilisation faite par l'utilisateur de la Plateforme ou du contenu des messages envoy\u00e9s",
                "Des dysfonctionnements li\u00e9s aux r\u00e9seaux, aux fournisseurs tiers (WhatsApp, h\u00e9bergeurs, etc.) ou \u00e0 des \u00e9v\u00e9nements de force majeure",
                "De la perte ou de l'alt\u00e9ration de donn\u00e9es r\u00e9sultant d'une utilisation non conforme de la Plateforme",
              ]}
            />
            <Paragraph>
              En tout &eacute;tat de cause, la responsabilit&eacute; totale de Nodes Technology au titre des pr&eacute;sentes CGU est
              limit&eacute;e au montant des sommes effectivement vers&eacute;es par l&apos;utilisateur au cours des douze (12) mois
              pr&eacute;c&eacute;dant l&apos;&eacute;v&eacute;nement donnant lieu &agrave; responsabilit&eacute;.
            </Paragraph>
          </Section>

          {/* Article 13 */}
          <Section icon={Ban} title="Article 13 - Suspension et R&eacute;siliation" index={14}>
            <SubSection title="13.1 Par l'utilisateur">
              <Paragraph>
                L&apos;utilisateur peut cesser d&apos;utiliser la Plateforme &agrave; tout moment. La suppression du compte peut &ecirc;tre
                demand&eacute;e aupr&egrave;s de Nodes Technology. Les cr&eacute;dits restants ne seront pas rembours&eacute;s sauf disposition
                contraire.
              </Paragraph>
            </SubSection>
            <SubSection title="13.2 Par Nodes Technology">
              <Paragraph>
                Nodes Technology se r&eacute;serve le droit de suspendre ou de r&eacute;silier l&apos;acc&egrave;s d&apos;un utilisateur &agrave; la
                Plateforme, sans pr&eacute;avis ni indemnit&eacute;, en cas de :
              </Paragraph>
              <List
                items={[
                  "Violation des pr\u00e9sentes CGU",
                  "Utilisation frauduleuse ou abusive de la Plateforme",
                  "Non-paiement des sommes dues",
                  "Demande des autorit\u00e9s comp\u00e9tentes",
                ]}
              />
            </SubSection>
          </Section>

          {/* Article 14 */}
          <Section icon={PenLine} title="Article 14 - Modification des CGU" index={15}>
            <Paragraph>
              Nodes Technology se r&eacute;serve le droit de modifier les pr&eacute;sentes CGU &agrave; tout moment. Les utilisateurs
              seront inform&eacute;s de toute modification substantielle par notification sur la Plateforme ou par email.
              La poursuite de l&apos;utilisation de la Plateforme apr&egrave;s modification vaut acceptation des nouvelles CGU.
            </Paragraph>
          </Section>

          {/* Article 15 */}
          <Section icon={Gavel} title="Article 15 - Droit Applicable et Litiges" index={16}>
            <Paragraph>
              Les pr&eacute;sentes CGU sont r&eacute;gies par le droit de la R&eacute;publique du Congo. En cas de litige, les parties
              s&apos;engagent &agrave; rechercher une solution amiable. &Agrave; d&eacute;faut d&apos;accord, le litige sera soumis aux
              juridictions comp&eacute;tentes de Brazzaville, R&eacute;publique du Congo.
            </Paragraph>
          </Section>

          {/* Article 16 */}
          <Section icon={Mail} title="Article 16 - Contact" index={17}>
            <Paragraph>
              Pour toute question relative aux pr&eacute;sentes CGU ou &agrave; l&apos;utilisation de la Plateforme, vous pouvez
              contacter Nodes Technology :
            </Paragraph>
            <div className="rounded-lg border border-border/40 bg-muted/30 p-4 space-y-0.5">
              <p className="text-[13px] font-medium">Ets NODES TECHNOLOGIE</p>
              <p className="text-[12px] text-muted-foreground">Brazzaville, R&eacute;publique du Congo</p>
              <p className="text-[12px] text-muted-foreground">Email : support@nodes-hub.com</p>
            </div>
          </Section>

          {/* Footer */}
          <div className="pt-3" style={stagger(18)}>
            <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                En utilisant la plateforme Flow, vous reconnaissez avoir lu, compris et accept&eacute; les pr&eacute;sentes
                Conditions G&eacute;n&eacute;rales d&apos;Utilisation.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
