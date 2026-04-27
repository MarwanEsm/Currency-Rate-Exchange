/** `/admin/orders` — minimal inbox for `submitted` buy requests (fulfillment off-app). */
import AdminPageGuard from "@/components/admin/AdminPageGuard";
import AdminSubmittedOrdersScreen from "@/screens/adminSubmittedOrders/AdminSubmittedOrdersScreen";

const AdminOrdersPage = () => {
    return (
        <AdminPageGuard title="Admin: new requests">
            <AdminSubmittedOrdersScreen />
        </AdminPageGuard>
    );
};

export default AdminOrdersPage;
