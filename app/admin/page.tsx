"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  Clock,
  LogOut,
  Users,
  FileText,
  Download,
  Search,
  Calendar,
  Euro,
  Filter,
  X,
  Building2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { checkAdminAuth, logoutAdmin } from "@/lib/admin-auth";
import AdminLogin from "@/app/admin/login/admin-login";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import EventsManagement from "@/components/events-management";
import ClientsManagement from "@/components/clients-management";

interface Attestation {
  id: string;
  token_id: string;
  prestataire_nom: string;
  prestataire_prenom: string;
  prestataire_email: string;
  prestation_description: string;
  prestation_date_debut: string;
  prestation_montant: number;
  status: string;
  pdf_url?: string;
  created_at: string;
  updated_at: string;
  sent_at?: string;
  pdf_generated?: boolean;
  invoice_processed: boolean;
  client?: any;
  token?: any;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    used: 0,
    pending: 0,
    attestations: 0,
  });
  const [activeTab, setActiveTab] = useState("tokens");
  const [attestationTab, setAttestationTab] = useState("completed");

  // Filtres pour les attestations
  const [filters, setFilters] = useState({
    search: "",
    dateStart: "",
    dateEnd: "",
    minAmount: "",
    maxAmount: "",
    eventType: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  // Pour gérer le clic sur la colonne “Facture traitée”
  const [invoiceToggling, setInvoiceToggling] = useState<string | null>(null);

  const handleLogout = () => {
    logoutAdmin();
    setIsAuthenticated(false);
  };

  useEffect(() => {
    setIsAuthenticated(checkAdminAuth());
    setLoading(false);
  }, []);

  /**
   * 1) On charge le nombre total de clients
   * 2) On compte les attestations pdf_generated = true  → “complétées”
   * 3) On compte les attestations pdf_generated = false → “en attente”
   */
  const loadStats = async () => {
    try {
      // 1) Total clients
      const { count: clientsCount } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });

      // 2) Attestations complétées (pdf_generated = true)
      const { count: completedCount } = await supabase
        .from("attestations")
        .select("*", { count: "exact", head: true })
        .eq("pdf_generated", true);

      // 3) Attestations en attente (pdf_generated = false)
      const { count: pendingCount } = await supabase
        .from("attestations")
        .select("*", { count: "exact", head: true })
        .eq("pdf_generated", false);

      setStats({
        total: clientsCount || 0,
        used: completedCount || 0,
        pending: pendingCount || 0,
        attestations: (completedCount || 0) + (pendingCount || 0),
      });
    } catch (error) {
      console.error("Erreur chargement statistiques:", error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
      loadAttestations();
    }
  }, [isAuthenticated]);

  const loadAttestations = async () => {
    try {
      const { data, error } = await supabase
        .from("attestations")
        .select(`
          *,
          invoice_processed,
          client:clients(*),
          token:tokens(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAttestations(data || []);
    } catch (error) {
      console.error("Erreur chargement attestations:", error);
    }
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      dateStart: "",
      dateEnd: "",
      minAmount: "",
      maxAmount: "",
      eventType: "",
    });
  };

  /**
   * Filtrage en fonction de l’onglet “completed” ou “pending” :
   *  - complétées  = pdf_generated = true
   *  - en attente   = pdf_generated = false
   * Ensuite, on applique les autres filtres (recherche, date, montant, eventType).
   */
  const filteredAttestations = attestations.filter((attestation) => {
    if (attestationTab === "completed" && !attestation.pdf_generated) {
      return false;
    }
    if (attestationTab === "pending" && attestation.pdf_generated) {
      return false;
    }

    // Filtre “recherche par nom”
    if (
      filters.search &&
      !`${attestation.prestataire_nom} ${attestation.prestataire_prenom}`
        .toLowerCase()
        .includes(filters.search.toLowerCase())
    ) {
      return false;
    }

    // Filtre date de début
    if (
      filters.dateStart &&
      new Date(attestation.prestation_date_debut) < new Date(filters.dateStart)
    ) {
      return false;
    }
    if (
      filters.dateEnd &&
      new Date(attestation.prestation_date_debut) > new Date(filters.dateEnd)
    ) {
      return false;
    }

    // Filtre montant min/max
    if (
      filters.minAmount &&
      attestation.prestation_montant < Number(filters.minAmount)
    ) {
      return false;
    }
    if (
      filters.maxAmount &&
      attestation.prestation_montant > Number(filters.maxAmount)
    ) {
      return false;
    }

    // Filtre “eventType” au sein de description
    if (
      filters.eventType &&
      !attestation.prestation_description
        .toLowerCase()
        .includes(filters.eventType.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMMM yyyy", { locale: fr });
    } catch (e) {
      return dateString;
    }
  };

  const getEventType = (description: string) => {
    if (description.toLowerCase().includes("roland-garros")) {
      return "Roland-Garros";
    }
    return "Autre";
  };

  /**
   * Bascule le champ `invoice_processed` pour une attestation donnée.
   */
  const toggleInvoiceProcessed = async (attId: string, newValue: boolean) => {
    setInvoiceToggling(attId);
    try {
      const { error } = await supabase
        .from("attestations")
        .update({ invoice_processed: newValue })
        .eq("id", attId);
      if (error) throw error;
      await loadAttestations();
    } catch (err) {
      console.error("Erreur mise à jour invoice_processed:", err);
    } finally {
      setInvoiceToggling(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4" />
          <p className="text-white">Chargement…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <div className="flex items-center mb-4 sm:mb-0">
            <Building2 className="h-8 w-8 text-blue-400 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-white">TGZ Conciergerie</h1>
              <p className="text-slate-400">Administration des attestations</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Total clients
              </CardTitle>
              <Users className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Attestations complétées
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{stats.used}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                En attente
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Total attestations
              </CardTitle>
              <FileText className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{stats.attestations}</div>
            </CardContent>
          </Card>
        </div>

        {/* Onglets principaux */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="flex space-x-2 overflow-x-auto bg-slate-800 border-slate-700 rounded-lg px-1">
            <TabsTrigger
              value="tokens"
              className="flex-1 min-w-[120px] data-[state=active]:bg-slate-700 text-slate-300"
            >
              Gestion des clients
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className="flex-1 min-w-[120px] data-[state=active]:bg-slate-700 text-slate-300"
            >
              Événements
            </TabsTrigger>
            <TabsTrigger
              value="attestations"
              className="flex-1 min-w-[120px] data-[state=active]:bg-slate-700 text-slate-300"
            >
              Attestations
            </TabsTrigger>
          </TabsList>
          <div className="h-1" />

          {/* Contenu onglet Clients */}
          <TabsContent value="tokens">
            <ClientsManagement />
          </TabsContent>

          {/* Contenu onglet Événements */}
          <TabsContent value="events">
            <EventsManagement />
          </TabsContent>

          {/* Contenu onglet Attestations */}
          <TabsContent value="attestations">
            <Tabs value={attestationTab} onValueChange={setAttestationTab} className="mb-6">
              <TabsList className="bg-slate-800 border-slate-700">
                <TabsTrigger
                  value="completed"
                  className="data-[state=active]:bg-slate-700 text-slate-300"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complétées
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="data-[state=active]:bg-slate-700 text-slate-300"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  En attente
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filtres */}
            <Card className="mb-6 bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row justify-between items-center">
                  <CardTitle className="text-lg flex items-center text-white">
                    <Search className="mr-2 h-4 w-4" />
                    Recherche et filtres
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="mt-3 sm:mt-0 text-slate-400 hover:text-white hover:bg-slate-700"
                  >
                    <Filter className="mr-1 h-4 w-4" />
                    {showFilters ? "Masquer les filtres" : "Afficher les filtres"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Rechercher par nom..."
                      value={filters.search}
                      onChange={(e) =>
                        setFilters({ ...filters, search: e.target.value })
                      }
                      className="w-full bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="whitespace-nowrap border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <X className="mr-1 h-4 w-4" />
                    Réinitialiser
                  </Button>
                </div>

                {showFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <Label className="text-slate-300 flex items-center">
                        <Calendar className="inline-block mr-1 h-4 w-4" /> Date début
                      </Label>
                      <Input
                        type="date"
                        value={filters.dateStart}
                        onChange={(e) =>
                          setFilters({ ...filters, dateStart: e.target.value })
                        }
                        className="mt-1 w-full bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300 flex items-center">
                        <Calendar className="inline-block mr-1 h-4 w-4" /> Date fin
                      </Label>
                      <Input
                        type="date"
                        value={filters.dateEnd}
                        onChange={(e) =>
                          setFilters({ ...filters, dateEnd: e.target.value })
                        }
                        className="mt-1 w-full bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300 flex items-center">
                        <Euro className="inline-block mr-1 h-4 w-4" /> Montant min (€)
                      </Label>
                      <Input
                        type="number"
                        value={filters.minAmount}
                        onChange={(e) =>
                          setFilters({ ...filters, minAmount: e.target.value })
                        }
                        className="mt-1 w-full bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300 flex items-center">
                        <Euro className="inline-block mr-1 h-4 w-4" /> Montant max (€)
                      </Label>
                      <Input
                        type="number"
                        value={filters.maxAmount}
                        onChange={(e) =>
                          setFilters({ ...filters, maxAmount: e.target.value })
                        }
                        className="mt-1 w-full bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Liste des attestations */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <FileText className="mr-2 h-5 w-5" />
                  {attestationTab === "completed"
                    ? "Attestations complétées"
                    : "Attestations en attente"}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {filteredAttestations.length} attestation(s) trouvée(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Wrapper pour scroll horizontal sur mobile */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-300 whitespace-nowrap">
                          Prestataire
                        </TableHead>
                        <TableHead className="text-slate-300 whitespace-nowrap">
                          Date
                        </TableHead>
                        <TableHead className="text-slate-300 whitespace-nowrap">
                          Montant
                        </TableHead>
                        <TableHead className="text-slate-300 whitespace-nowrap">
                          Événement
                        </TableHead>
                        <TableHead className="text-slate-300 whitespace-nowrap">
                          Statut
                        </TableHead>
                        <TableHead className="text-slate-300 whitespace-nowrap">
                          Facture traitée
                        </TableHead>
                        <TableHead className="text-slate-300 whitespace-nowrap">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttestations.map((attestation) => (
                        <TableRow
                          key={attestation.id}
                          className="border-slate-700"
                        >
                          {/* Prestataire */}
                          <TableCell className="text-white whitespace-nowrap">
                            <div>
                              <div className="font-medium">
                                {attestation.prestataire_nom}{" "}
                                {attestation.prestataire_prenom}
                              </div>
                              <div className="text-sm text-slate-400">
                                {attestation.prestataire_email}
                              </div>
                            </div>
                          </TableCell>

                          {/* Date */}
                          <TableCell className="text-slate-300 whitespace-nowrap">
                            {formatDate(attestation.prestation_date_debut)}
                          </TableCell>

                          {/* Montant */}
                          <TableCell className="text-white whitespace-nowrap">
                            <span className="font-mono">
                              {attestation.prestation_montant.toFixed(2)} €
                            </span>
                          </TableCell>

                          {/* Événement */}
                          <TableCell className="whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={
                                getEventType(attestation.prestation_description) ===
                                "Roland-Garros"
                                  ? "bg-orange-900/20 text-orange-400 border-orange-800"
                                  : "border-slate-600 text-slate-300"
                              }
                            >
                              {getEventType(attestation.prestation_description)}
                            </Badge>
                          </TableCell>

                          {/* Statut (pdf_generated) */}
                          <TableCell className="whitespace-nowrap">
                            {attestation.pdf_generated ? (
                              <Badge className="bg-green-900/20 text-green-400 border-green-800">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Complétée
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="bg-orange-900/20 text-orange-400 border-orange-800"
                              >
                                <Clock className="mr-1 h-3 w-3" />
                                En attente
                              </Badge>
                            )}
                          </TableCell>

                          {/* Facture traitée (invoice_processed) */}
                          <TableCell className="whitespace-nowrap">
                            {attestation.invoice_processed ? (
                              <Badge
                                className="bg-green-900/20 text-green-400 border-green-800 cursor-pointer"
                                onClick={() =>
                                  toggleInvoiceProcessed(attestation.id, false)
                                }
                              >
                                ✓ Oui
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-slate-600 text-slate-300 cursor-pointer"
                                onClick={() =>
                                  toggleInvoiceProcessed(attestation.id, true)
                                }
                              >
                                Non
                              </Badge>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="whitespace-nowrap">
                            {attestation.pdf_url ? (
                              <a
                                href={attestation.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
                                >
                                  <Download className="mr-1 h-3 w-3" />
                                  PDF
                                </Button>
                              </a>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                className="border-slate-600 text-slate-500"
                              >
                                <Clock className="mr-1 h-3 w-3" />
                                En attente
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {filteredAttestations.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <FileText className="mx-auto h-12 w-12 text-slate-600 mb-4" />
                    <p>
                      Aucune attestation{" "}
                      {attestationTab === "completed"
                        ? "complétée"
                        : "en attente"}{" "}
                      trouvée
                    </p>
                    <p className="text-sm">
                      {attestationTab === "completed"
                        ? "Les attestations apparaîtront ici une fois finalisées"
                        : "Les attestations en cours apparaîtront ici"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
