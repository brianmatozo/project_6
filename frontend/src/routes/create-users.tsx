"use client";
// useNavigate
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

export const Route = createFileRoute("/create-users")({
  component: RouteComponent,
});

const userCreationSchema = z.object({
  username: z.string().regex(/[A-Za-z]+/i, "Username must be a string"),
  email: z.string().email("Email must be a valid email"),
});

function RouteComponent() {
  // const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof userCreationSchema>>({
    resolver: zodResolver(userCreationSchema),
    defaultValues: {
      username: "",
      email: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof userCreationSchema>) => {
      try {
        const res = await api.users.create.post({
          email: data.email,
          username: data.username,
        });
        if (!res.response.ok) {
          const errorData = JSON.stringify(await res.response.body)
          throw new Error(errorData || "Server error");
        }
        return res;
      } catch (error) {
        throw error;
      }
    },

    onError: (error: any) => {
      const errorMessage = error?.message ?? "An error has occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Successfully created`,
      });
    },
  });

  async function onSubmit(data: z.infer<typeof userCreationSchema>) {
    mutation.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Username" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="email@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Loading..." : "Submit"}
        </Button>
      </form>
    </Form>
  );
}
