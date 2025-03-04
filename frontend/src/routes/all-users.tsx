import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/all-users")({
  component: AllUsers,
});

async function getAllUsers() {
  const res = await api.users.db.get();
  if (!res.response.ok) {
    throw new Error("Server error");
  }
  const data = await res.data;
  return data;
}

function AllUsers() {
  const { isPending, error, data } = useQuery({
    queryKey: ["all-users"],
    queryFn: getAllUsers,
  });
  if (isPending) return "Loading...";
  if (error) return "An error has occurred: " + error.message;
  if (!data) return "No data";
  return (
    <Table>
      <TableCaption>A list of your users.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Username</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Created At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((users) => (
          <TableRow key={users.id}>
            <TableCell>{users.username}</TableCell>
            <TableCell>{users.email}</TableCell>
            <TableCell>{users.created_at}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
