// app/admin/page.tsx
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
  X as XIcon,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { checkAdminAuth, logoutAdmin } from "@/lib/admin-auth";
import AdminLoginPage from "./login/page";
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
  const [filters, setFilters] = useState({
    search: "",
    dateStart: "",
    dateEnd: "",
    minAmount: "",
    maxAmount: "",
    eventType: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [invoiceToggling, setInvoiceToggling] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const logged = checkAdminAuth();
    setIsAuthenticated(logged);
    setLoading(false);
  }, []);

  const handleLogout = () => {
    logoutAdmin();
    setIsAuthenticated(false);
  };

  const loadStats = async () => {
    try {
      const { count: clientsCount } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });

      const { count: completedCount } = await supabase
        .from("attestations")
        .select("*", { count: "exact", head: true })
        .eq("pdf_generated", true);

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

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
      loadAttestations();
    }
  }, [isAuthenticated]);

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

  const filteredAttestations = attestations.filter((att) => {
    if (attestationTab === "completed" && !att.pdf_generated) return false;
    if (attestationTab === "pending" && att.pdf_generated) return false;
    if (
      filters.search &&
      !`${att.prestataire_nom} ${att.prestataire_prenom}`
        .toLowerCase()
        .includes(filters.search.toLowerCase())
    ) return false;
    if (
      filters.dateStart &&
      new Date(att.prestation_date_debut) < new Date(filters.dateStart)
    ) return false;
    if (
      filters.dateEnd &&
      new Date(att.prestation_date_debut) > new Date(filters.dateEnd)
    ) return false;
    if (
      filters.minAmount &&
      att.prestation_montant < Number(filters.minAmount)
    ) return false;
    if (
      filters.maxAmount &&
      att.prestation_montant > Number(filters.maxAmount)
    ) return false;
    if (
      filters.eventType &&
      !att.prestation_description
        .toLowerCase()
        .includes(filters.eventType.toLowerCase())
    ) return false;
    return true;
  });

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMMM yyyy", { locale: fr });
    } catch {
      return dateString;
    }
  };

  const getEventType = (desc: string) =>
    desc.toLowerCase().includes("roland-garros") ? "Roland-Garros" : "Autre";

  const toggleInvoiceProcessed = async (id: string, newValue: boolean) => {
    setInvoiceToggling(id);
    try {
      const { error } = await supabase
        .from("attestations")
        .update({ invoice_processed: newValue })
        .eq("id", id);
      if (error) throw error;
      await loadAttestations();
    } catch (err) {
      console.error("Erreur mise à jour invoice_processed:", err);
    } finally {
      setInvoiceToggling(null);
    }
  };

  const deleteAttestation = async (id: string) => {
    if (!window.confirm("🚨 Es-tu sûr·e de vouloir supprimer cette facture ?")) return;
    if (
      !window.confirm(
        "Cette action est IRRÉVERSIBLE. Veux-tu vraiment supprimer la facture ?"
      )
    )
      return;

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("attestations")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await loadAttestations();
    } catch (err) {
      console.error("Erreur suppression :", err);
      alert("❌ Impossible de supprimer la facture. Vérifie la console.");
    } finally {
      setDeletingId(null);
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
    return <AdminLoginPage />;
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

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex justify-between pb-2">
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
            <CardHeader className="flex justify-between pb-2">
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
            <CardHeader className="flex justify-between pb-2">
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
            <CardHeader className="flex justify-between pb-2">
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

        {/* Main Tabs */}
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

          <TabsContent value="tokens">
            <ClientsManagement />
          </TabsContent>
          <TabsContent value="events">
            <EventsManagement />
          </TabsContent>
          <TabsContent value="attestations">
            <Tabs
              value={attestationTab}
              onValueChange={setAttestationTab}
              className="mb-6"
            >
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

            {/* Filters */}
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
                  <Input
                    placeholder="Rechercher par nom..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                    className="flex-1 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="whitespace-nowrap border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <XIcon className="mr-1 h-4 w-4" />
                    Réinitialiser
                  </Button>
                </div>

                {showFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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

            {/* Attestations Table */}
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-300">Prestataire</TableHead>
                        <TableHead className="text-slate-300">Date</TableHead>
                        <TableHead className="text-slate-300">Montant</TableHead>
                        <TableHead className="text-slate-300">Événement</TableHead>
                        <TableHead className="text-slate-300">Statut</TableHead>
                        <TableHead className="text-slate-300">Facture traitée</TableHead>
                        <TableHead className="text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttestations.map((att) => (
                        <TableRow key={att.id} className="border-slate-700">
                          <TableCell className="text-white">
                            <div>
                              <div className="font-medium">
                                {att.prestataire_nom} {att.prestataire_prenom}
                              </div>
                              <div className="text-sm text-slate-400">
                                {att.prestataire_email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {formatDate(att.prestation_date_debut)}
                          </TableCell>
                          <TableCell className="text-white">
                            <span className="font-mono">
                              {att.prestation_montant.toFixed(2)} €
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                getEventType(att.prestation_description) === "Roland-Garros"
                                  ? "destructive"
                                  : "outline"
                              }
                            >
                              {getEventType(att.prestation_description)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {att.pdf_generated ? (
                              <Badge className="bg-green-900/20 text-green-400 border-green-800">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Complétée
                              </Badge>
                            ) : (
                              <Badge className="bg-orange-900/20 text-orange-400 border-orange-800">
                                <Clock className="mr-1 h-3 w-3" />
                                En attente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {att.invoice_processed ? (
                              <Badge
                                className="bg-green-900/20 text-green-400 border-green-800 cursor-pointer"
                                onClick={() =>
                                  toggleInvoiceProcessed(att.id, false)
                                }
                              >
                                ✓ Oui
                              </Badge>
                            ) : (
                              <Badge
                                className="border-slate-600 text-slate-300 cursor-pointer"
                                onClick={() =>
                                  toggleInvoiceProcessed(att.id, true)
                                }
                              >
                                Non
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="space-x-2">
                            {att.pdf_url ? (
                              <a
                                href={att.pdf_url}
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
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteAttestation(att.id)}
                              disabled={deletingId === att.id}
                            >
                              <XIcon className="mr-1 h-3 w-3" />
                              {deletingId === att.id ? "Suppression…" : "Supprimer"}
                            </Button>
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
                      {attestationTab === "completed" ? "complétée" : "en attente"}{" "}
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
