"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Copy,
  CheckCircle,
  Eye,
  EyeOff,
  Activity,
  Clock,
} from "lucide-react";

import { supabase, type Client, type ClientWithStats } from "@/lib/supabase";
import {
  generateAccessCode,
  generateExpirationDate,
} from "@/lib/code-generator";

interface ActiveToken {
  id: string;
  token: string;
  used: boolean;
  created_at: string;
  used_at: string | null;
  expires_at?: string;
}

export default function ClientsManagement() {
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithStats | null>(
    null
  );
  const [tokenHistory, setTokenHistory] = useState<ActiveToken[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [showCode, setShowCode] = useState<{ [key: string]: boolean }>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Formulaire client : nom + numéro WhatsApp
  const [clientForm, setClientForm] = useState({
    name: "",
    phone: "",
  });

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoading(true);
    try {
      const { data: clientsData, error } = await supabase
        .from("clients")
        .select(
          `
          * ,
          tokens (
            id,
            token,
            used,
            created_at,
            used_at,
            expires_at
          ),
          attestations (
            id,
            status,
            pdf_generated
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const now = new Date();
      const clientsWithStats: ClientWithStats[] = (clientsData || []).map(
        (client: any) => {
          const allTokens: ActiveToken[] = client.tokens || [];
          const activeTokens = allTokens.filter(
            (t) => !t.used && (!t.used_at || new Date(t.used_at) > now)
          );
          const attestations = client.attestations || [];
          const completedAttestations = attestations.filter(
            (a: any) => a.pdf_generated
          );
          const pendingAttestations = attestations.filter(
            (a: any) => a.status !== "completed" || !a.pdf_generated
          );

          return {
            ...client,
            active_tokens_count: activeTokens.length,
            total_attestations_count: attestations.length,
            completed_attestations_count: completedAttestations.length,
            pending_attestations_count: pendingAttestations.length,
            active_token: activeTokens[0] || null,
            tokens: allTokens,
          };
        }
      );

      setClients(clientsWithStats);
    } catch (error) {
      console.error("Erreur chargement clients:", error);
    } finally {
      setLoading(false);
    }
  }

  function resetClientForm() {
    setClientForm({ name: "", phone: "" });
    setEditingClient(null);
  }

  function openClientDialog(client?: Client) {
    if (client) {
      setEditingClient(client);
      setClientForm({
        name: client.name,
        phone: client.phone || "",
      });
    } else {
      resetClientForm();
    }
    setIsDialogOpen(true);
  }

  function closeClientDialog() {
    setIsDialogOpen(false);
    resetClientForm();
  }

  async function saveClient() {
    if (!clientForm.name.trim() || !clientForm.phone.trim()) return;

    try {
      const clientData = {
        name: clientForm.name.trim(),
        phone: clientForm.phone.trim(),
        updated_at: new Date().toISOString(),
      };

      if (editingClient) {
        const { error } = await supabase
          .from("clients")
          .update(clientData)
          .eq("id", editingClient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert(clientData);
        if (error) throw error;
      }

      await loadClients();
      closeClientDialog();
    } catch (error) {
      console.error("Erreur sauvegarde client:", error);
    }
  }

  async function deleteClient(clientId: string) {
    if (
      !confirm(
        "Êtes-vous sûr de vouloir supprimer ce client ? Tous ses tokens et attestations associées seront supprimés."
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId);
      if (error) throw error;
      await loadClients();
    } catch (error) {
      console.error("Erreur suppression client:", error);
    }
  }

  /**
   * Génère un code et l'enregistre en base.
   * Ne lance PAS WhatsApp ; on affiche juste une alerte de confirmation.
   */
  async function generateAndSendCode(client: ClientWithStats) {
    setGenerating(client.id);
    try {
      if (client.active_tokens_count > 0) {
        alert(
          "Ce client a déjà un code d'accès actif. Veuillez attendre qu'il soit utilisé ou qu'il expire."
        );
        setGenerating(null);
        return;
      }

      const code = generateAccessCode();
      const expiresAt = generateExpirationDate(7);

      const tokenData = {
        token: code,
        client_id: client.id,
        type: "prestation",
        used: false,
        expires_at: expiresAt,
      };

      const { error: insertError } = await supabase
        .from("tokens")
        .insert(tokenData);
      if (insertError) throw insertError;

      alert(
        `✅ Code généré pour ${client.name} : ${code}\nVous pouvez à présent cliquer sur "WhatsApp" pour l’envoyer.`
      );

      await loadClients();
    } catch (error) {
      console.error("Erreur génération du code :", error);
      alert("❌ Erreur lors de la génération du code.");
    } finally {
      setGenerating(null);
    }
  }

  /**
   * Récupère le code actif pour le client, compose le lien WhatsApp
   * et ouvre WhatsApp Web/app dans un nouvel onglet.
   */
  function sendExistingCodeViaWhatsApp(client: ClientWithStats) {
    if (!client.active_token) {
      alert("Aucun code actif à envoyer. Générer un code d'abord.");
      return;
    }
    const codeActif = client.active_token.token;
    const phoneNumber = client.phone.replace(/[^0-9]/g, "");
    const message = encodeURIComponent(
      `Bonjour ${client.name},\n\nVotre code d'accès (toujours valide) : *${codeActif}*.\nBonne journée !`
    );
    const waLink = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(waLink, "_blank");
  }

  function toggleShowCode(clientId: string) {
    setShowCode((prev) => ({
      ...prev,
      [clientId]: !prev[clientId],
    }));
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error("Erreur copie :", error);
    }
  }

  // -----------------------
  // Historique des tokens
  // -----------------------
  async function openDeliveryDialog(client: ClientWithStats) {
    setSelectedClient(client);
    setIsDeliveryDialogOpen(true);

    try {
      const { data: tokens, error } = await supabase
        .from("tokens")
        .select("id, token, used, created_at, used_at")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setTokenHistory(tokens || []);
    } catch (error) {
      console.error("Erreur chargement historique tokens :", error);
      setTokenHistory([]);
    }
  }

  function closeDeliveryDialog() {
    setIsDeliveryDialogOpen(false);
    setSelectedClient(null);
    setTokenHistory([]);
  }

  function formatDate(dateString: string) {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  }

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4" />
          <p className="text-slate-400">Chargement des clients…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        {/* Header responsive: empile sur mobile, ligne sur sm+ */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center text-white text-lg sm:text-xl">
              <Users className="mr-2 h-5 w-5" />
              Gestion des clients
            </CardTitle>
            <CardDescription className="text-slate-400">
              Gérer les clients et distribuer des codes d’accès
            </CardDescription>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => openClientDialog()}
                className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouveau client
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingClient
                    ? "Modifier le client"
                    : "Créer un nouveau client"}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Seul le numéro WhatsApp est requis pour un client.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name" className="text-slate-300">
                    Nom du client *
                  </Label>
                  <Input
                    id="name"
                    value={clientForm.name}
                    onChange={(e) =>
                      setClientForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Nom complet du client"
                    className="bg-slate-700 border-slate-600 text-white w-full"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-slate-300">
                    Numéro WhatsApp *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={clientForm.phone}
                    onChange={(e) =>
                      setClientForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="+33 6 12 34 56 78"
                    className="bg-slate-700 border-slate-600 text-white w-full"
                  />
                </div>
              </div>

              <DialogFooter className="mt-4 flex flex-col sm:flex-row justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={closeClientDialog}
                  className="border-slate-600 text-slate-300 w-full sm:w-auto"
                >
                  Annuler
                </Button>
                <Button
                  onClick={saveClient}
                  disabled={
                    !clientForm.name.trim() || !clientForm.phone.trim()
                  }
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                >
                  {editingClient ? "Mettre à jour" : "Créer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Wrapper pour scroll horizontal sur mobile */}
        <div className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-slate-300 whitespace-nowrap">
                  Client
                </TableHead>
                <TableHead className="text-slate-300 whitespace-nowrap">
                  WhatsApp
                </TableHead>
                <TableHead className="text-slate-300 whitespace-nowrap">
                  Code actif
                </TableHead>
                <TableHead className="text-slate-300 whitespace-nowrap">
                  Attestations
                </TableHead>
                <TableHead className="text-slate-300 whitespace-nowrap">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id} className="border-slate-700">
                  {/* Nom */}
                  <TableCell className="text-white whitespace-nowrap">
                    <div className="font-medium">{client.name}</div>
                    <div className="text-sm text-slate-400">
                      Créé le {formatDate(client.created_at)}
                    </div>
                  </TableCell>

                  {/* Numéro WhatsApp */}
                  <TableCell className="text-white whitespace-nowrap">
                    {client.phone}
                  </TableCell>

                  {/* Code actif */}
                  <TableCell className="whitespace-nowrap">
                    {client.active_token ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-900/20 text-green-400 border-green-800">
                            Actif
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleShowCode(client.id)}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                          >
                            {showCode[client.id] ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        {showCode[client.id] && (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <code className="bg-slate-700 px-2 py-1 rounded text-xs font-mono text-green-400 break-all">
                              {client.active_token.token}
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                copyCode(client.active_token!.token)
                              }
                              className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                            >
                              {copiedCode === client.active_token!.token ? (
                                <CheckCircle className="h-3 w-3 text-green-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        )}
                        {client.active_token.expires_at && (
                          <div className="text-xs text-slate-400">
                            Expire le {formatDate(client.active_token.expires_at)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-slate-700 text-slate-400"
                      >
                        Aucun
                      </Badge>
                    )}
                  </TableCell>

                  {/* Statistiques attestations */}
                  <TableCell className="whitespace-nowrap">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Badge
                        variant="outline"
                        className="border-slate-600 text-slate-300 whitespace-nowrap"
                      >
                        {client.completed_attestations_count || 0} complétées
                      </Badge>
                      {client.pending_attestations_count! > 0 && (
                        <Badge
                          variant="outline"
                          className="border-orange-600 text-orange-400 whitespace-nowrap"
                        >
                          {client.pending_attestations_count} en attente
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="whitespace-nowrap">
                    <div className="flex flex-col sm:flex-row gap-2">
                      {client.active_tokens_count === 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateAndSendCode(client)}
                          disabled={generating === client.id}
                          className="border-green-600 text-green-400 hover:bg-green-900/20 whitespace-nowrap"
                        >
                          {generating === client.id ? (
                            <Clock className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Activity className="mr-1 h-3 w-3" />
                              Générer code
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendExistingCodeViaWhatsApp(client)}
                          className="border-blue-600 text-blue-400 hover:bg-blue-900/20 whitespace-nowrap"
                        >
                          <Activity className="mr-1 h-3 w-3" />
                          WhatsApp
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDeliveryDialog(client)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 whitespace-nowrap"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Historique
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openClientDialog(client)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 whitespace-nowrap"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Modifier
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteClient(client.id)}
                        className="border-red-600 text-red-400 hover:bg-red-900/20 whitespace-nowrap"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {clients.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <Users className="mx-auto h-12 w-12 text-slate-600 mb-4" />
            <p>Aucun client créé pour le moment</p>
            <p className="text-sm">Cliquez sur “Nouveau client” pour commencer</p>
          </div>
        )}

        {/* DIALOG : Historique des codes (tokens) */}
        <Dialog
          open={isDeliveryDialogOpen}
          onOpenChange={setIsDeliveryDialogOpen}
        >
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-white">
                <Activity className="mr-2 h-5 w-5" />
                Historique des codes – {selectedClient?.name}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Suivi des codes d’accès générés (WhatsApp) pour ce client
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-96 overflow-y-auto py-2">
              {tokenHistory.length > 0 ? (
                tokenHistory.map((t) => (
                  <div key={t.id} className="bg-slate-700 p-4 rounded-lg">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {t.used ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <Clock className="h-4 w-4 text-orange-400" />
                        )}
                        <span className="font-medium">
                          {t.used ? "Utilisé" : "En attente"}
                        </span>
                      </div>
                      <span className="text-sm text-slate-400 whitespace-nowrap">
                        {formatDate(t.created_at)}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p className="break-all">
                        <strong>Code WA :</strong>{" "}
                        <code className="bg-slate-800 px-1 rounded text-xs">
                          {t.token}
                        </code>
                      </p>
                      {t.used_at && (
                        <p className="text-slate-400">
                          <strong>Utilisé le :</strong> {formatDate(t.used_at)}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p>Aucun historique de codes</p>
                  <p className="text-sm">Les codes apparaîtront ici</p>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-end">
              <Button
                variant="outline"
                onClick={closeDeliveryDialog}
                className="border-slate-600 text-slate-300 whitespace-nowrap"
              >
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
