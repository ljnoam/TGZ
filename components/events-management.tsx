"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Calendar, MapPin, Tag, X } from "lucide-react";
import { supabase, type Event } from "@/lib/supabase";

export default function EventsManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Formulaire
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    courts: [] as string[],
    categories: [] as string[],
  });
  const [newCourt, setNewCourt] = useState("");
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Erreur chargement événements:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      courts: [],
      categories: [],
    });
    setNewCourt("");
    setNewCategory("");
    setEditingEvent(null);
  };

  const openDialog = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        name: event.name,
        description: event.description || "",
        courts: [...event.courts],
        categories: [...event.categories],
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const addCourt = () => {
    if (newCourt.trim() && !formData.courts.includes(newCourt.trim())) {
      setFormData((prev) => ({
        ...prev,
        courts: [...prev.courts, newCourt.trim()],
      }));
      setNewCourt("");
    }
  };

  const removeCourt = (court: string) => {
    setFormData((prev) => ({
      ...prev,
      courts: prev.courts.filter((c) => c !== court),
    }));
  };

  const addCategory = () => {
    if (newCategory.trim() && !formData.categories.includes(newCategory.trim())) {
      setFormData((prev) => ({
        ...prev,
        categories: [...prev.categories, newCategory.trim()],
      }));
      setNewCategory("");
    }
  };

  const removeCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c !== category),
    }));
  };

  const saveEvent = async () => {
    if (!formData.name.trim()) return;

    try {
      const eventData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        courts: formData.courts,
        categories: formData.categories,
        updated_at: new Date().toISOString(),
      };

      if (editingEvent) {
        // Mise à jour
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", editingEvent.id);
        if (error) throw error;
      } else {
        // Création
        const { error } = await supabase.from("events").insert(eventData);
        if (error) throw error;
      }

      await loadEvents();
      closeDialog();
      console.log(
        `✅ Événement ${editingEvent ? "mis à jour" : "créé"} avec succès`
      );
    } catch (error) {
      console.error("Erreur sauvegarde événement:", error);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) return;

    try {
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;

      await loadEvents();
      console.log("✅ Événement supprimé");
    } catch (error) {
      console.error("Erreur suppression événement:", error);
    }
  };

  const toggleEventStatus = async (event: Event) => {
    try {
      const { error } = await supabase
        .from("events")
        .update({
          active: !event.active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.id);

      if (error) throw error;
      await loadEvents();
    } catch (error) {
      console.error("Erreur changement statut:", error);
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Chargement des événements...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        {/* Header responsive : empile sur mobile, ligne sur sm+ */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center text-white text-lg sm:text-xl">
              <Calendar className="mr-2 h-5 w-5" />
              Gestion des événements
            </CardTitle>
            <CardDescription className="text-slate-400">
              Créer et gérer les événements avec leurs courts et catégories
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
                <Plus className="mr-2 h-4 w-4" />
                Nouvel événement
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingEvent
                    ? "Modifier l'événement"
                    : "Créer un nouvel événement"}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Configurez les détails de l'événement et ses options
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Informations de base */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-slate-300">
                      Nom de l'événement *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Ex: Roland-Garros"
                      className="bg-slate-700 border-slate-600 text-white w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-slate-300">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Description de l'événement"
                      className="bg-slate-700 border-slate-600 text-white w-full"
                    />
                  </div>
                </div>

                {/* Courts */}
                <div>
                  <Label className="text-slate-300 flex items-center mb-2">
                    <MapPin className="mr-1 h-4 w-4" />
                    Courts disponibles
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <Input
                      value={newCourt}
                      onChange={(e) => setNewCourt(e.target.value)}
                      placeholder="Nom du court"
                      className="bg-slate-700 border-slate-600 text-white w-full"
                      onKeyPress={(e) => e.key === "Enter" && addCourt()}
                    />
                    <Button
                      type="button"
                      onClick={addCourt}
                      variant="outline"
                      className="border-slate-600 whitespace-nowrap"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Ajouter</span>
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.courts.map((court) => (
                      <Badge
                        key={court}
                        variant="secondary"
                        className="bg-blue-900/20 text-blue-400 border-blue-800 whitespace-nowrap flex items-center"
                      >
                        {court}
                        <button
                          type="button"
                          onClick={() => removeCourt(court)}
                          className="ml-1 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Catégories */}
                <div>
                  <Label className="text-slate-300 flex items-center mb-2">
                    <Tag className="mr-1 h-4 w-4" />
                    Catégories disponibles
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Nom de la catégorie"
                      className="bg-slate-700 border-slate-600 text-white w-full"
                      onKeyPress={(e) => e.key === "Enter" && addCategory()}
                    />
                    <Button
                      type="button"
                      onClick={addCategory}
                      variant="outline"
                      className="border-slate-600 whitespace-nowrap"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Ajouter</span>
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.categories.map((category) => (
                      <Badge
                        key={category}
                        variant="secondary"
                        className="bg-green-900/20 text-green-400 border-green-800 whitespace-nowrap flex items-center"
                      >
                        {category}
                        <button
                          type="button"
                          onClick={() => removeCategory(category)}
                          className="ml-1 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={closeDialog}
                  className="border-slate-600 text-slate-300 w-full sm:w-auto whitespace-nowrap"
                >
                  Annuler
                </Button>
                <Button
                  onClick={saveEvent}
                  disabled={!formData.name.trim()}
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto whitespace-nowrap"
                >
                  {editingEvent ? "Mettre à jour" : "Créer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Wrapper pour scroll horizontal sur mobile */}
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-slate-300 whitespace-nowrap">
                  Événement
                </TableHead>
                <TableHead className="text-slate-300 whitespace-nowrap">
                  Courts
                </TableHead>
                <TableHead className="text-slate-300 whitespace-nowrap">
                  Catégories
                </TableHead>
                <TableHead className="text-slate-300 whitespace-nowrap">
                  Statut
                </TableHead>
                <TableHead className="text-slate-300 whitespace-nowrap">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id} className="border-slate-700">
                  <TableCell className="text-white whitespace-nowrap">
                    <div>
                      <div className="font-medium">{event.name}</div>
                      {event.description && (
                        <div className="text-sm text-slate-400">
                          {event.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="flex flex-wrap gap-1">
                      {event.courts.slice(0, 3).map((court) => (
                        <Badge
                          key={court}
                          variant="outline"
                          className="text-xs border-slate-600 text-slate-300 whitespace-nowrap"
                        >
                          {court}
                        </Badge>
                      ))}
                      {event.courts.length > 3 && (
                        <Badge
                          variant="outline"
                          className="text-xs border-slate-600 text-slate-400 whitespace-nowrap"
                        >
                          +{event.courts.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="flex flex-wrap gap-1">
                      {event.categories.slice(0, 3).map((category) => (
                        <Badge
                          key={category}
                          variant="outline"
                          className="text-xs border-slate-600 text-slate-300 whitespace-nowrap"
                        >
                          {category}
                        </Badge>
                      ))}
                      {event.categories.length > 3 && (
                        <Badge
                          variant="outline"
                          className="text-xs border-slate-600 text-slate-400 whitespace-nowrap"
                        >
                          +{event.categories.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleEventStatus(event)}
                      className={
                        event.active
                          ? "border-green-600 text-green-400 hover:bg-green-900/20 whitespace-nowrap"
                          : "border-slate-600 text-slate-400 hover:bg-slate-700 whitespace-nowrap"
                      }
                    >
                      {event.active ? "Actif" : "Inactif"}
                    </Button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDialog(event)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 whitespace-nowrap"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteEvent(event.id)}
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

        {events.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <Calendar className="mx-auto h-12 w-12 text-slate-600 mb-4" />
            <p>Aucun événement créé pour le moment</p>
            <p className="text-sm">Cliquez sur “Nouvel événement” pour commencer</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
